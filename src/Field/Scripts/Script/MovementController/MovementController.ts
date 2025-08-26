import { Object3D, Scene, Vector3 } from "three";
import { create } from "zustand";
import { numberToFloatingPoint } from "../../../../utils";
import { createAnimationController } from "../AnimationController/AnimationController";
import PromiseSignal from "../../../../PromiseSignal";
import useGlobalStore from "../../../../store";
import createRotationController from "../RotationController/RotationController";
import createScriptState from "../state";

type MoveOptions = {
  customMovementTarget: Vector3 | undefined;
  duration: number | undefined;
  isAnimationEnabled: boolean;
  isAllowedToCrossBlockedTriangles: boolean;
  isFacingTarget: boolean;
  isAllowedToLeaveWalkmesh: boolean;
  userControlledSpeed: number | undefined;
  distanceToStopAnimationFromTarget: number;
}

const createMovementController = (id: string | number, animationController: ReturnType<typeof createAnimationController>, useScriptStateStore: ReturnType<typeof createScriptState>) => {
  let isStopping = false;

  const {getState, setState, subscribe} = create(() => ({
    hasBeenPlaced: false,
    hasMoved: false,
    id,
    movementSpeed: 2560,
    needsZAdjustment: true,
    position: {
      current: new Vector3(-999, 0, 0),
      duration: 0 as number | undefined,
      distanceToStopAnimationFromTarget: 0,
      isAnimationEnabled: true,
      isAllowedToCrossBlockedTriangles: true,
      isAllowedToLeaveWalkmesh: false,
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

  const setPosition = async (position: Vector3) => {
    resolvePendingPositionSignal();
    const signal = new PromiseSignal();

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
        signal,
      },
    });

    await signal.promise;
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
      isAllowedToCrossBlockedTriangles: true,
      isAllowedToLeaveWalkmesh: false,
      userControlledSpeed: undefined,
      distanceToStopAnimationFromTarget: 0
    }

    const {
      distanceToStopAnimationFromTarget,
      duration,
      isAnimationEnabled,
      isAllowedToCrossBlockedTriangles,
      isAllowedToLeaveWalkmesh,
      isFacingTarget,
      userControlledSpeed,
    } = {
      ...defaultOptions,
      ...passedOptions,
    }

    resolvePendingPositionSignal();
    const signal = new PromiseSignal();

    const { walkmeshController } = useGlobalStore.getState();

    if (!walkmeshController) {
      return;
    }

    const goal = isAllowedToLeaveWalkmesh ? target : walkmeshController.getPositionOnWalkmesh(target);

    setState({
      position: {
        current: getState().position.current,
        goal: goal ?? target,
        duration: duration && duration > 0 ? duration : undefined,
        distanceToStopAnimationFromTarget,
        isAnimationEnabled,
        isAllowedToCrossBlockedTriangles,
        isAllowedToLeaveWalkmesh,
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
        isPaused: false,
        signal,
        totalDistance
      }
    });

    await signal.promise;
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

  const tick = (entity: Object3D, delta: number) => {
    const { position, offset, movementSpeed: baseMovementSpeed } = getState();

    const { isAnimationEnabled } = position;

    const { walkmeshController } = useGlobalStore.getState();

    if (!walkmeshController) {
      return;
    }

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
   
    const { current: currentPosition, duration, isAllowedToCrossBlockedTriangles, isAllowedToLeaveWalkmesh, goal: positionGoal, userControlledSpeed } = position;
    const movementSpeed = (userControlledSpeed !== undefined ? userControlledSpeed : baseMovementSpeed) * 0.75;
    if (positionGoal) {
      const speed = movementSpeed / 2560
      const maxDistance = speed * delta * (duration && duration > 0 ? duration : 1);

      const remainingDistance = currentPosition.distanceTo(positionGoal);

      if (remainingDistance <= maxDistance || duration === 0) {
        currentPosition.copy(positionGoal);
        resolvePendingPositionSignal();
        setState({
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
        const desiredNextPos = currentPosition.clone().add(direction.multiplyScalar(maxDistance).divideScalar(10));
        const newPos = isAllowedToLeaveWalkmesh ? desiredNextPos : walkmeshController.moveToward(currentPosition, desiredNextPos, isAllowedToCrossBlockedTriangles);
        currentPosition.copy(newPos);
      }

      setState({
        hasBeenPlaced: true,
      })
    }

    const { current: currentOffset, goal: offsetGoal, duration: offsetDuration, totalDistance } = offset;

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
        
        const direction = offsetGoal.clone().sub(currentOffset).normalize();
        currentOffset.add(direction.multiplyScalar(stepDistance));
      }
    }

    entity.position.set(getPosition().x, getPosition().y, getPosition().z);


    if (useScriptStateStore.getState().partyMemberId !== useGlobalStore.getState().party[0]) {
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
      hasBeenPlaced: false,
      hasMoved: false,
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

  const setHasMoved = (hasMoved: boolean) => {
    setState({
      hasMoved,
    });
  }

  return {
    getState,
    getPosition,
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
    setHasMoved
  }
}

export default createMovementController;