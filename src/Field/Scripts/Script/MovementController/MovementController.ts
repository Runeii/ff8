import { Object3D, Scene, Vector3 } from "three";
import { create } from "zustand";
import { getPositionOnWalkmesh, numberToFloatingPoint } from "../../../../utils";
import { createAnimationController } from "../AnimationController/AnimationController";
import PromiseSignal from "../../../../PromiseSignal";
import useGlobalStore from "../../../../store";
import { createRotationController } from "../RotationController/RotationController";

export type MoveOptions = {
  customMovementTarget: Vector3 | undefined;
  duration: number | undefined;
  isAnimationEnabled: boolean;
  isFacingTarget: boolean;
  userControlledSpeed: number | undefined;
  distanceToStopAnimationFromTarget: number;
}

export const createMovementController = (id: string | number, animationController: ReturnType<typeof createAnimationController>, scene: Scene) => {
  let isStopping = false;

  const {getState, setState, subscribe} = create(() => ({
    hasBeenPlaced: false,
    id,
    movementSpeed: 2560,
    needsZAdjustment: true,
    loopSignal: undefined as PromiseSignal | undefined,
    position: {
      current: new Vector3(9999, 0, 0),
      duration: 0 as number | undefined,
      distanceToStopAnimationFromTarget: 0,
      hasResolvedEarly: false,
      isAnimationEnabled: true,
      isFacingTarget: true,
      isPaused: false,
      userControlledSpeed: undefined as number | undefined,
      goal: undefined as Vector3 | undefined,
      signal: undefined as PromiseSignal| undefined,
    },
    offset: {
      current: new Vector3(0,0,0),
      duration: 0,
      goal: undefined as Vector3 | undefined,
      hasResolvedEarly: false,
      isPaused: false,
      signal: undefined as PromiseSignal | undefined,
      totalDistance: 0
    },
    footsteps: {
      isActive: false,
      leftSound: undefined as Howl | undefined,
      rightSound: undefined as Howl | undefined,
    },
    isClimbingLadder: false,
    speedBeforeClimbingLadder: 0,
  }));

  const resolvePendingPositionSignal = () => {
    const { position } = getState();
    if (position.signal) {
      position.signal.resolve();
      setState({
        position: {
          ...position,
          signal: undefined,
        }
      });
    }
  }

  const resolvePendingOffsetSignal = () => {
    const { offset } = getState();
    if (offset.signal) {
      offset.signal.resolve();
      setState({
        offset: {
          ...offset,
          signal: undefined,
        }
      });
    }
  }

  const setMovementSpeed = (speed: number) => {
    setState({
      movementSpeed: speed,
    });
  }

  const setPosition = (position: Vector3) => {
    resolvePendingPositionSignal();
    setState({
      hasBeenPlaced: true,
      needsZAdjustment: true,
      position: {
        ...getState().position,
        goal: position,
        duration: 0,
        isAnimationEnabled: false,
        isFacingTarget: false,
        isPaused: false,
        signal: undefined,
      },
    });
  }

  const setOffset = (x: number, y: number, z: number) => {
    const target = new Vector3(...[x, y, z].map(numberToFloatingPoint));

    resolvePendingOffsetSignal();
    setState({
      offset: {
        ...getState().offset,
        goal: target,
        isPaused: false,
        duration: 0,
        signal: undefined,
      },
    });
  }

  const moveToPoint = async (target: Vector3, passedOptions?: Partial<MoveOptions>) => {
    const defaultOptions: MoveOptions = {
      customMovementTarget: undefined,
      duration: undefined,
      isAnimationEnabled: true,
      isFacingTarget: true,
      userControlledSpeed: undefined,
      distanceToStopAnimationFromTarget: 0
    }

    const {
      distanceToStopAnimationFromTarget,
      duration,
      isAnimationEnabled,
      isFacingTarget,
      userControlledSpeed,
    } = {
      ...defaultOptions,
      ...passedOptions,
    }

    resolvePendingPositionSignal();
    const signal = new PromiseSignal();

    setState({
      hasBeenPlaced: true,
      position: {
        current: getState().position.current,
        goal: target,
        duration: duration && duration > 0 ? duration : undefined,
        distanceToStopAnimationFromTarget,
        hasResolvedEarly: false,
        isAnimationEnabled,
        isFacingTarget,
        isPaused: false,
        userControlledSpeed,
        signal
      },
    });

    isStopping = false;

    const movementSpeed = userControlledSpeed !== undefined ? userControlledSpeed : getState().movementSpeed;
    if (isAnimationEnabled) {
      animationController.playMovementAnimation(movementSpeed > 2695 ? 'run' : 'walk');
    }

    await signal.promise;
  }

  const moveToObject = async (name: string, scene: Scene, passedOptions?: Partial<MoveOptions>) => {
    const targetActor = scene.getObjectByName(name);
    
    if (!targetActor) {
      console.warn('Target object not found', name);
      return;
    }

    const target = targetActor.getWorldPosition(new Vector3());

    await moveToPoint(target, passedOptions)
  }

  const moveToOffset = async (x: number, y: number, z:number, duration: number) => {
    const target = new Vector3(...[x,y,z].map(numberToFloatingPoint));
    const currentOffset = getState().offset.current;
    const totalDistance = currentOffset.distanceTo(target);

    resolvePendingOffsetSignal();
    const signal = new PromiseSignal();
    setState({
      offset: {
        current: getState().offset.current,
        goal: target,
        duration,
        hasResolvedEarly: false,
        isPaused: false,
        signal,
        totalDistance
      }
    });

    await signal.promise;
  }

  const loopOffsets = async (startX: number, startY: number, startZ: number, endX: number, endY: number, endZ: number, duration: number) => {
    const loopSignal = new PromiseSignal();
    setState({
      loopSignal,
    });
    let isLooping = true;

    const loop = async () => {
      await moveToOffset(startX, startY, startZ, duration);
      if (!isLooping) {
        return;
      }
      await moveToOffset(endX, endY, endZ, duration);
      if (isLooping) {
        window.requestAnimationFrame(loop);
      }
    }
    window.requestAnimationFrame(loop);
    await loopSignal.promise;
    isLooping = false;
  }

  const getPosition = () => {
    const { position, offset } = getState();
    const positionValue = position.current
    const offsetValue = offset.current

    return {
      x: positionValue.x + offsetValue.x,
      y: positionValue.y + offsetValue.y,
      z: positionValue.z + offsetValue.z,
    }
  }

  const stop = () => {
    setState({
      position: {
        ...getState().position,
        goal: undefined
      },
      offset: {
        ...getState().offset,
        goal: undefined
      }
    });
  }

  let positionPauseStateBeforePause = false;
  let offsetPauseStateBeforePause = false;
  const pause = () => {
    positionPauseStateBeforePause = getState().position.isPaused;
    offsetPauseStateBeforePause = getState().offset.isPaused;

    setState({
      position: {
        ...getState().position,
        isPaused: true,
      },
      offset: {
        ...getState().offset,
        isPaused: true,
      }
    });
  }

  const resume = () => {
    setState({
      position: {
        ...getState().position,
        isPaused: positionPauseStateBeforePause,
      },
      offset: {
        ...getState().offset,
        isPaused: offsetPauseStateBeforePause,
      }
    });
  }

  ///

  // FOOTSTEPS
  const setFootsteps = () => 
    setState(state => ({
      footsteps: {
        ...state.footsteps,
        leftSound: new Howl({
          src: `/audio/footsteps/2.mp3`,
          preload: true,
          loop: false,
          mute:false,
          volume: 1,
        }),
        rightSound: new Howl({
          src: `/audio/footsteps/3.mp3`,
          preload: true,
          loop: false,
          mute:false,
          volume: 1,
        }),
      }
    }))

  const enableFootsteps = () =>
    setState(state => ({
      footsteps: {
        ...state.footsteps,
        isActive: true,
      }
    }))
  
  const disableFootsteps = () =>
    setState(state => ({
      footsteps: {
        ...state.footsteps,
        isActive: false,
      }
    }))

  const resetFootsteps = () =>
    setState({
      footsteps: {
        isActive: false,
        leftSound: undefined,
        rightSound: undefined,
      }
    })
  
  const setIsClimbingLadder = (isClimbingLadder: boolean, speed?: number) =>
    setState({
      movementSpeed: isClimbingLadder ? (speed ?? 22) * 100 : getState().speedBeforeClimbingLadder,
      isClimbingLadder,
      speedBeforeClimbingLadder: isClimbingLadder ? getState().movementSpeed : 0,
    })

  let cachedWalkmesh: Object3D | undefined = undefined;
  const tick = (entity: Object3D, delta: number) => {
    const { position, offset, movementSpeed: baseMovementSpeed } = getState();

    const { isAnimationEnabled } = position;

    if (isStopping && isAnimationEnabled) {
      animationController.playMovementAnimation('stand');
      isStopping = false;
    }

    if (position.isPaused && offset.isPaused) {
      return;
    }
    
    if (!position.goal && !offset.goal) {
      return;
    }
   
    const { current: currentPosition, duration, hasResolvedEarly: hasResolvedPositionEarly, goal: positionGoal, userControlledSpeed } = position;
    const movementSpeed = (userControlledSpeed !== undefined ? userControlledSpeed : baseMovementSpeed);
    if (positionGoal) {
      if (!cachedWalkmesh) {
        cachedWalkmesh = scene.getObjectByName('walkmesh') as Object3D;
      }

      const speed = movementSpeed / 2560;
      const maxDistance = speed * delta * (duration && duration > 0 ? duration : 1);

      const remainingDistance = currentPosition.distanceTo(positionGoal);

      const framesUntilComplete = Math.ceil(remainingDistance / maxDistance);
      if (framesUntilComplete <= 4 && !hasResolvedPositionEarly) { // Resolve 4 frames early
          resolvePendingPositionSignal();
          setState({
            position: {
              ...getState().position,
              hasResolvedEarly: true,
            }
          })
      }

      if (remainingDistance <= maxDistance || duration === 0) {
        currentPosition.copy(positionGoal);
        resolvePendingPositionSignal();
        setState({
          hasBeenPlaced: true,
          position: {
            ...getState().position,
            userControlledSpeed: undefined,
            goal: undefined,
            isPaused: true,
          }
        });

        isStopping = true;
      } else {
        const direction = positionGoal.clone().sub(currentPosition).normalize();
        currentPosition.add(direction.multiplyScalar(maxDistance).divideScalar(10));
        currentPosition.copy(getPositionOnWalkmesh(currentPosition, cachedWalkmesh) ?? currentPosition)
      }
    }

    const { current: currentOffset, goal: offsetGoal, hasResolvedEarly: hasResolvedOffsetEarly, duration: offsetDuration, totalDistance } = offset;

    if (offsetGoal) {
      const durationInSeconds = offsetDuration / 25;
      const remainingDistance = currentOffset.distanceTo(offsetGoal);

      if (remainingDistance < 0.0005 || durationInSeconds <= 0) {
        // Snap to goal if we're basically there
        currentOffset.copy(offsetGoal);
        resolvePendingOffsetSignal();
        setState({
          offset: {
            ...getState().offset,
            goal: undefined,
            isPaused: true,
          }
        });
      } else {
        const speed = totalDistance / durationInSeconds; // units per second
        const maxDistance = speed * delta; // distance to move this frame
        const stepDistance = Math.min(maxDistance, remainingDistance);
        
        // Resolve 4 frames early
        const framesUntilComplete = Math.ceil(remainingDistance / maxDistance);
        if (framesUntilComplete <= 4 && !hasResolvedOffsetEarly) {
            resolvePendingOffsetSignal();
            setState({
              offset: {
                ...getState().offset,
                hasResolvedEarly: true,
              }
            });
        }

        const direction = offsetGoal.clone().sub(currentOffset).normalize();
        currentOffset.add(direction.multiplyScalar(stepDistance));
      }
    }

    entity.position.set(getPosition().x, getPosition().y, getPosition().z);
    entity.userData.hasBeenPlaced = true;

    if (id !== useGlobalStore.getState().party[0]) {
      return;
    }

    useGlobalStore.setState(state => {
      state.hasMoved = true;

      const latestCongaWaypoint = state.congaWaypointHistory[0];
      if (latestCongaWaypoint && latestCongaWaypoint.position.distanceTo(entity.position) < 0.005) {
        return state;
      }
      state.congaWaypointHistory.push({
        position: entity.position.clone(),
        angle: (entity.userData.rotationController as ReturnType<typeof createRotationController>).getState().angle.get(),
        speed: movementSpeed
      })
      if (state.congaWaypointHistory.length > 100) {
        state.congaWaypointHistory.shift();
      }
      return state;
    });
  }

  const setHasAdjustedZ = (hasAdjustedZ: boolean) => {
    setState({
      needsZAdjustment: !hasAdjustedZ,
    });
  }

  const reset = () => {
    resolvePendingOffsetSignal();
    resolvePendingPositionSignal();

    setState(state => ({
      movementSpeed: 2560,
      needsZAdjustment: true,
      isClimbingLadder: false,
      speedBeforeClimbingLadder: 0,
      position: {
        ...state.position,
        duration: 0,
        isAnimationEnabled: true,
        isFacingTarget: true,
        isPaused: false,
        userControlledSpeed: undefined,
        goal: undefined,
        signal: undefined,
      },
      offset: {
        ...state.offset,
        duration: 0,
        isPaused: false,
        goal: undefined,
        signal: undefined,
      },
    }))
  }

  const hasBeenPlaced = () => {
    return getState().hasBeenPlaced;
  }

  return {
    getState,
    getPosition,
    hasBeenPlaced,
    loopOffsets,
    moveToObject,
    moveToOffset,
    moveToPoint,
    setOffset,
    setPosition,
    pause,
    setMovementSpeed,
    subscribe,
    stop,
    setFootsteps,
    enableFootsteps,
    disableFootsteps,
    resetFootsteps,
    setIsClimbingLadder,
    tick,
    setHasAdjustedZ,
    reset,
    resume,
  }
}

export default createMovementController;