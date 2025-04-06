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
  WALKING: 0.16,
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
    offset: new SpringValue<number[]>([0,0,0])
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
    await position.start([target.x, target.y, target.z], {
      config: {
        duration: duration ?? (distance * 30000000 / getState().movementSpeed),
      },
      immediate: duration === 0,
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

  const stop = () => {}

  return {
    getState,
    getPosition,
    moveToObject,
    moveToOffset,
    moveToPoint,
    setMovementTarget,
    setMovementSpeed,
    setPosition,
    subscribe,
    stop
  }
}

export default createMovementController;