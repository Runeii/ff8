import { Scene, Vector3 } from "three";
import { create } from "zustand";
import { SpringValue } from "@react-spring/web";
import { numberToFloatingPoint } from "../../../../utils";

export type MoveOptions = {
  duration?: number;
  isAnimationEnabled: boolean;
  isFacingTarget: boolean;
}

export const SPEED = {
  WALKING: 0.9,
  RUNNING: 0.5,
}

export const createMovementController = (id: string | number) => {
  const {getState, setState, subscribe} = create(() => ({
    id,
    isAnimationEnabled: true,
    movementTarget: undefined as Vector3 | undefined,
    movementSpeed: 2560,
    // @ts-expect-error SpringValue incorrectly typed
    position: new SpringValue<number[]>([0,0,0]),
    // @ts-expect-error SpringValue incorrectly typed
    offset: new SpringValue<number[]>([0,0,0]),
    footsteps: {
      isActive: false,
      leftSound: undefined as Howl | undefined,
      rightSound: undefined as Howl | undefined,
    },
    isClimbingLadder: false,
    speedBeforeClimbingLadder: 0,
  }));

  const setMovementTarget = (target?: Vector3) => {
    setState({
      movementTarget: target,
    });
  }

  const setIsAnimationEnabled = (isAnimationEnabled: boolean) => {
    setState({
      isAnimationEnabled,
    });
  }

  const setMovementSpeed = (speed: number) => {
    setState({
      movementSpeed: speed,
    });
  }

  const setPosition = (position: VectorLike) => {
    getState().position.set([
      position.x,
      position.y,
      position.z,
    ]);
  }

  let raf: number | null = null;
  const moveToPoint = async (target: Vector3, passedOptions?: Partial<MoveOptions>) => {
    window.cancelAnimationFrame(raf as number);
    raf = null;

    const defaultOptions: MoveOptions = {
      duration: undefined,
      isAnimationEnabled: true,
      isFacingTarget: true,
    }

    const {
      duration,
      isAnimationEnabled,
      isFacingTarget,
    } = {
      ...defaultOptions,
      ...passedOptions,
    }
    
    setMovementTarget(isFacingTarget ? target : undefined);

    setIsAnimationEnabled(!!isAnimationEnabled);
    const position = getState().position
    const distance = target.distanceTo(new Vector3().fromArray(position.get()));

    let calculatedDuration = duration ?? (distance * 30000000 / getState().movementSpeed);
    if (Number.isNaN(calculatedDuration) || Number.isFinite(calculatedDuration) === false) {
      calculatedDuration = 0;
    }
    await position.start([target.x, target.y, target.z], {
      config: {
        duration: calculatedDuration
      },
      immediate: calculatedDuration === 0,
    });

    setIsAnimationEnabled(true);
    setMovementTarget(undefined)
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

    getState().offset.resume();
    await getState().offset.start([
      target.x,
      target.y,
      target.z,
    ], {
      config: {
        duration: duration / 30 * 1000,
      },
      immediate: duration === 0,
    })
  }

  const getPosition = () => {
    const { position, offset } = getState();
    const positionValue = position.get();
    const offsetValue = offset.get();

    return {
      x: positionValue[0] + offsetValue[0],
      y: positionValue[1] + offsetValue[1],
      z: positionValue[2] + offsetValue[2],
    }
  }

  const stop = () => {
    const { position, offset } = getState();
    position.stop();
    offset.stop();
    setMovementTarget(undefined);
  }

  const pause = () => {
    const { position, offset } = getState();
    position.set(position.get());
    position.finish();
    offset.set(offset.get());
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
  
  const setIsClimbingLadder = (isClimbingLadder: boolean) =>
    setState({
      movementSpeed: isClimbingLadder ? 1250 : getState().speedBeforeClimbingLadder,
      isClimbingLadder,
      speedBeforeClimbingLadder: isClimbingLadder ? getState().movementSpeed : 0,
    })

  return {
    getState,
    getPosition,
    moveToObject,
    moveToOffset,
    moveToPoint,
    pause,
    setMovementTarget,
    setMovementSpeed,
    setPosition,
    subscribe,
    stop,
    setFootsteps,
    enableFootsteps,
    disableFootsteps,
    resetFootsteps,
    setIsClimbingLadder
  }
}

export default createMovementController;