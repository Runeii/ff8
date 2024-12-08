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


export async function playAnimation(
  spring: SpringValue<number>,
  speed: number,
  duration: number,
  isLooping: boolean,
  range?: [number, number],
) {
  const FPS = 30;

  // Total number of frames in the full animation
  const totalFrames = duration * FPS;

  // Determine start and end offsets
  // If no range is given, we animate the entire sequence from 0 to 1
  let startOffset = 0;
  let endOffset = 1;

  if (range && range.filter(Boolean).length === 2) {
    const [startFrame, endFrame] = range;

    // Ensure the frames are within valid bounds
    if (startFrame < 0 || endFrame > totalFrames) {
      console.warn(`Range [${startFrame}, ${endFrame}] is out of bounds for ${totalFrames} total frames.`);
    }

    startOffset = startFrame / totalFrames;
    endOffset = endFrame / totalFrames;

    console.log('At FPS', FPS, 'with duration', duration, 'total frames:', totalFrames, 'start:', startFrame, 'end:', endFrame);
  }

  // The portion of the animation we are going to play (normalized)
  const portion = endOffset - startOffset;

  // The portion of the full animation duration that corresponds to the selected range
  const portionDurationInSeconds = duration * portion;

  // Adjust for speed:
  // If speed = 2, it means we cover the same portion in half the time
  const adjustedDurationInMs = (portionDurationInSeconds * 1000) / speed;

  console.log(
    `Playing animation from ${startOffset.toFixed(3)} to ${endOffset.toFixed(3)} ` +
    `(${(portion * 100).toFixed(1)}% of the full animation) in ${adjustedDurationInMs} ms at speed ${speed}, looping: ${isLooping}`
  );

  if (startOffset === endOffset) {
    spring.set(startOffset);
    return;
  }


  // Start the spring animation
  await spring.start({
    from: startOffset,
    to: endOffset,
    loop: isLooping,
    immediate: false,
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
