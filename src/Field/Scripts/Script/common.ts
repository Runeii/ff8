import { SpringValue } from "@react-spring/web";
import useGlobalStore from "../../../store";
import { getScriptEntity } from "./Model/modelUtils";
import { openMessage } from "./utils";
import { Group, Scene, Vector3 } from "three";

export const fadeInMap = async () => {
  const { canvasOpacitySpring, isMapFadeEnabled } = useGlobalStore.getState()
  if (!isMapFadeEnabled) {
    return;
  }

  await canvasOpacitySpring.start(1);
}

export const fadeOutMap = async () => {
  const { canvasOpacitySpring, isMapFadeEnabled } = useGlobalStore.getState()
  if (!isMapFadeEnabled) {
    return;
  }

  canvasOpacitySpring.start(0);
}

export const displayMessage = async (id: number, x: number, y: number, channel: number, width?: number, height?: number) => {
  const { availableMessages } = useGlobalStore.getState();

  const uniqueId = `${id}--${Date.now()}`;
  await openMessage(uniqueId, availableMessages[id], {
    x,
    y,
    channel,
    width,
    height
  });
}

export const turnToFaceAngle = async (angle: number, frames: number, spring: SpringValue<number>) => {
  console.log('Turning to face angle:', angle, frames);
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

export const moveToPoint = async (spring: SpringValue<number[]>, targetPoint: Vector3, movementSpeed: number) => {
  const start = spring.get();
  const distance = targetPoint.distanceTo(new Vector3(...start));

  console.log('Moving for', movementSpeed, distance, distance / movementSpeed * 100000)

  await spring.start(targetPoint.toArray(), {
    immediate: false,
    config: {
      duration: distance / movementSpeed * 3 * 10000000,
    }
  })
}

export const isTouching = (thisId: number, targetName: string, scene: Scene) => {
  const thisMesh = getScriptEntity(scene, thisId) as Group;
  const targetMesh = scene.getObjectByName(targetName) as Group;

  if (!thisMesh || !targetMesh) {
    console.warn('Error checking if touching:', thisMesh, targetMesh);
    return false;
  }

  const thisPosition = thisMesh.getWorldPosition(new Vector3());
  const targetPosition = targetMesh.getWorldPosition(new Vector3());

  return thisPosition.distanceTo(targetPosition) < 0.25;
}

export const playBaseAnimation = (spring: SpringValue<number>, speed: number, duration: number, range?: [number, number]) =>
  playAnimation(
    spring,
    speed,
    duration,
    true,
    range,
  )


export const playAnimation = async (
  spring: SpringValue<number>,
  speed: number,
  duration: number,
  isLooping: boolean,

  range: [number, number] | undefined = undefined
) => {
  spring.set(0);

  const FPS = 30;
  const startOffset = range ? (1 / duration) * range[0] : 0;
  const endOffset = range ? (1 / duration) * range[1] : 1;

  const effectiveFps = FPS * speed;

  // Total frames in the original duration
  const totalFrames = duration * FPS;

  // Adjusted duration in seconds
  const adjustedDurationInSeconds = totalFrames / effectiveFps;

  // Convert to milliseconds
  const adjustedDurationInMs = adjustedDurationInSeconds * 1000;

  await spring.start(endOffset, {
    from: startOffset,
    immediate: false,
    loop: isLooping,
    config: {
      duration: adjustedDurationInMs,
    },
  });
}

export const animateBackground = async (spring: SpringValue<number>, speed: number, startFrame: number, endFrame: number, isLooping: boolean) => {
  spring.set(startFrame);

  const duration = (Math.max(endFrame, startFrame) - Math.min(endFrame, startFrame)) * speed * 30 + 10;

  await spring.start(endFrame, {
    from: startFrame,
    immediate: false,
    loop: isLooping,
    config: {
      duration,
    },
  });
}

export const KEY_FLAGS = {
  16: '', // 'Cancel'
  32: '', // 'Menu'
  64: ' ', // 'OK/Accept'
  128: '', //'Card game button'

  // Used by KEYON
  192: ' ', // 'OK/Accept',

  4096: 'ArrowUp',
  16384: 'ArrowDown',
} as const;

let DOWN: string[] = [];
export const isKeyDown = (keyFlag: keyof typeof KEY_FLAGS) => {
  return DOWN.includes(KEY_FLAGS[keyFlag]);
}

const keydownListener = (event: KeyboardEvent) => {
  const { currentMessages } = useGlobalStore.getState();
  if (currentMessages.length > 0) {
    return;
  }
  DOWN.push(event.key);
}

const keyupListener = (event: KeyboardEvent) => {
  DOWN = DOWN.filter(key => key !== event.key);
}

export const attachKeyDownListeners = () => {
  window.addEventListener('keydown', keydownListener);
  window.addEventListener('keyup', keyupListener);
}
