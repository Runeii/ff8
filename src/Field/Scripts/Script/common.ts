import { SpringValue } from "@react-spring/web";
import useGlobalStore from "../../../store";
import { getScriptEntity } from "./Model/modelUtils";
import { openMessage } from "./utils";
import { Group, Scene } from "three";

export const fadeOutMap = async () => {
  const { fadeSpring, isMapFadeEnabled } = useGlobalStore.getState()
  if (!isMapFadeEnabled) {
    return;
  }
  console.log('out')
  fadeSpring.opacity.start(0);
}

export const displayMessage = async (id: number, x: number, y: number, channel: number) => {
  const { availableMessages } = useGlobalStore.getState();

  const uniqueId = `${id}--${Date.now()}`;
  await openMessage(uniqueId, availableMessages[id], x, y);
}

export const turnToFaceAngle = async (angle: number, frames: number, spring: SpringValue<number>) => {
  spring.start(angle, {
    immediate: frames === 0,
    config: {
      duration: frames / 15 * 1000,
    }
  });
}

export const turnToFaceEntity = async (thisId: number, targetName: string, duration: number, scene: Scene, spring: SpringValue<number>) => {
  const thisMesh = getScriptEntity(scene, thisId);
  const targetMesh = scene.getObjectByName(targetName) as Group;

  if (!thisMesh || !targetMesh) {
    console.warn('Error turning to face entity:', thisMesh, targetMesh);
    return;
  }
  const currentAngleDirection = thisMesh.rotation.y;
  const targetAngleDirection = Math.atan2(
    targetMesh.position.x - thisMesh.position.x,
    targetMesh.position.z - thisMesh.position.z
  );

  const angleDifference = targetAngleDirection - currentAngleDirection;
  const normalizedAngleDifference = ((angleDifference + Math.PI) % (2 * Math.PI)) - Math.PI;
  const scaledAngleDifference = Math.round((normalizedAngleDifference + Math.PI) * (255 / (2 * Math.PI)));

  const currentScaledAngle = spring.get();
  const adjustedScaleValue = (currentScaledAngle + scaledAngleDifference) % 255;

  turnToFaceAngle(adjustedScaleValue, duration, spring);
}

export const playBaseAnimation = (spring: SpringValue<number>, speed: number, range?: [number, number]) =>
  playAnimation(
    spring,
    speed,
    true,
    range,
  )


export const playAnimation = async (
  spring: SpringValue<number>,
  speed: number,
  isLooping: boolean,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _range: [number, number] = [0, 1]
) => {
  spring.set(0);

  // speed 1 = 2fps
  // const duration = 2000

  await spring.start(1, {
    from: 0,
    immediate: false,
    loop: isLooping,
    config: {
      duration: speed * 1000,
    },
  });
}

export const animateBackground = async (spring: SpringValue<number>, speed: number, startFrame: number, endFrame: number, isLooping: boolean) => {
  spring.set(startFrame);

  await spring.start(endFrame, {
    from: startFrame,
    immediate: false,
    loop: isLooping,
    config: {
      duration: (endFrame - startFrame) * speed * 30,
    }
  });
}

export const KEY_FLAGS = {
  16: 'Cancel',
  32: 'Menu',
  64: 'OK/Accept',
  128: 'Card game button',
} as const;

let DOWN: string[] = [];
export const isKeyDown = (keyFlag: keyof typeof KEY_FLAGS) => {
  return DOWN.includes(KEY_FLAGS[keyFlag]);
}

const keydownListener = (event: KeyboardEvent) => {
  DOWN.push(event.key);
}

const keyupListener = (event: KeyboardEvent) => {
  DOWN = DOWN.filter(key => key !== event.key);
}

export const attachKeyDownListeners = () => {
  window.addEventListener('keydown', keydownListener);
  window.addEventListener('keyup', keyupListener);
}
