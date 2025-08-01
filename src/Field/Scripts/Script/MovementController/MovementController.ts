import { Object3D, Scene, Vector3 } from "three";
import { create } from "zustand";
import { numberToFloatingPoint } from "../../../../utils";
import { createAnimationController } from "../AnimationController/AnimationController";
import PromiseSignal from "../../../../PromiseSignal";

export type MoveOptions = {
  customMovementTarget?: Vector3;
  duration?: number;
  isAnimationEnabled: boolean;
  isFacingTarget: boolean;
  userControlledSpeed: number | undefined;
} 

export const createMovementController = (id: string | number, animationController: ReturnType<typeof createAnimationController>) => {
  let isStopping = false;

  const {getState, setState, subscribe} = create(() => ({
    id,
    movementSpeed: 2560,
    isPaused: false,
    needsZAdjustment: true,
    loopSignal: undefined as PromiseSignal | undefined,
    position: {
      current: new Vector3(0, 0, 0),
      duration: 0 as number | undefined,
      isAnimationEnabled: true,
      isFacingTarget: true,
      userControlledSpeed: undefined as number | undefined,
      goal: undefined as Vector3 | undefined,
      signal: undefined as PromiseSignal| undefined,
    },
    offset: {
      current: new Vector3(0,0,0),
      duration: 0,
      goal: undefined as Vector3 | undefined,
      signal: undefined as PromiseSignal | undefined,
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
      isPaused: false,
      needsZAdjustment: true,
      position: {
        ...getState().position,
        goal: position,
        duration: 0,
        isAnimationEnabled: false,
        isFacingTarget: false,
        signal: undefined,
      },
    });
  }

  const setOffset = (x: number, y: number, z: number) => {
    const target = new Vector3(...[x, y, z].map(numberToFloatingPoint));

    resolvePendingOffsetSignal();
    setState({
      isPaused: false,
      offset: {
        ...getState().offset,
        goal: target,
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
    }

    const {
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
      isPaused: false,
      position: {
        current: getState().position.current,
        goal: target,
        duration: duration && duration > 0 ? duration : undefined,
        isAnimationEnabled,
        isFacingTarget,
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
    resolvePendingOffsetSignal();
    const signal = new PromiseSignal();
    setState({
      isPaused: false,
      offset: {
        current: getState().offset.current,
        goal: target,
        duration,
        signal
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

  const pause = () => {
    setState({
      isPaused: true,
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
    const { position, offset, isPaused, movementSpeed } = getState();

    const { isAnimationEnabled } = position;
    if (isStopping && isAnimationEnabled) {
      animationController.playMovementAnimation('stand');
      isStopping = false;
    }

    if (isPaused) {

      return;
    }
    
    if (!position.goal && !offset.goal) {
      return;
    }
    
    const { current: currentPosition, duration, goal: positionGoal, userControlledSpeed } = position;
    if (positionGoal) {
      const speed = (userControlledSpeed !== undefined ? userControlledSpeed : movementSpeed) / 2560; // units per second
      const maxDistance = speed * delta * (duration && duration > 0 ? duration : 1);

      const remainingDistance = currentPosition.distanceTo(positionGoal);
      
      if (remainingDistance <= maxDistance || duration === 0) {
        currentPosition.copy(positionGoal);
        resolvePendingPositionSignal();
        setState({
          isPaused: true,
          position: {
            ...getState().position,
            userControlledSpeed: undefined,
            goal: undefined,
          }
        });

        isStopping = true;
      } else {
        const direction = positionGoal.clone().sub(currentPosition).normalize();
        currentPosition.add(direction.multiplyScalar(maxDistance).divideScalar(10));
      }
    }

    const { current: currentOffset, goal: offsetGoal, duration: offsetDuration } = offset;

    if (offsetGoal) {
      const durationInSeconds = offsetDuration / 25; // convert tenths to seconds
      const remainingDistance = currentOffset.distanceTo(offsetGoal);

      if (remainingDistance < 0.0005 || durationInSeconds <= 0) {
        // Snap to goal if we're basically there
        currentOffset.copy(offsetGoal);
        resolvePendingOffsetSignal();
        setState({
          isPaused: true,
          offset: {
            ...getState().offset,
            goal: undefined,
          }
        });
      } else {
        // Fraction of total path to move this frame
        const fractionThisFrame = delta / durationInSeconds; 
        const step = remainingDistance * fractionThisFrame;

        const direction = offsetGoal.clone().sub(currentOffset).normalize();
        currentOffset.add(direction.multiplyScalar(step));
      }
    }


    entity.position.set(getPosition().x, getPosition().y, getPosition().z);
  }

  const setHasAdjustedZ = (hasAdjustedZ: boolean) => {
    setState({
      needsZAdjustment: !hasAdjustedZ,
    });
  }

  return {
    getState,
    getPosition,
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
  }
}

export default createMovementController;