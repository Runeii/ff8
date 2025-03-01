import { SpringValue } from "@react-spring/web";
import useGlobalStore from "../../../store";
import { getScriptEntity } from "./Model/modelUtils";
import { convert255ToRadians, convertRadiansTo255, getRotationAngleToDirection, openMessage } from "./utils";
import { Group, Scene, Vector3 } from "three";
import { WORLD_DIRECTIONS } from "../../../utils";

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

export const displayMessage = async (id: number, x: number, y: number, channel: number, width?: number, height?: number, isCloseable = true) => {
  const { availableMessages } = useGlobalStore.getState();

  const uniqueId = `${id}--${Date.now()}`;
  await openMessage(uniqueId, availableMessages[id], {
    x,
    y,
    channel,
    width,
    height,
    isCloseable
  });
}

export const turnToFaceAngle = async (angle: number, frames: number, spring: SpringValue<number>) => {
  // console.log('Turning to face angle:', angle, frames);
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

  // Current forward
  const meshForward = new Vector3(-1,0,0).applyQuaternion(thisMesh.quaternion).normalize();
  meshForward.z = 0;

  const meshUp = new Vector3(0, 0, 1).applyQuaternion(thisMesh.quaternion).normalize();

  const fieldDirection = useGlobalStore.getState().fieldDirection;
  // Calculate initial angle to face down
  const base = convert255ToRadians(fieldDirection);
  const direction = WORLD_DIRECTIONS.FORWARD.clone().applyAxisAngle(meshUp, base);
  const faceDownBaseAngle = getRotationAngleToDirection(meshForward, direction, meshUp);

  const targetDirection = targetMesh.position.clone().sub(thisMesh.position).normalize();
  const targetAngle = getRotationAngleToDirection(meshForward, targetDirection, meshUp);
  
  let radian = (targetAngle - faceDownBaseAngle) % (Math.PI * 2);
  if (radian < 0) {
    radian += Math.PI * 2; // Ensure the angle is in the range [0, 2π)
  }

  const angle255 = convertRadiansTo255(radian);
  turnToFaceAngle(angle255, duration, spring);
}

export const calculateMovingSpeed = (distance: number, movementSpeed: number) => distance / movementSpeed * 3 * 10000000

export const moveToPoint = async (spring: SpringValue<number[]>, targetPoint: Vector3, movementSpeed: number, isDebugging?: boolean) => {
  const start = spring.get();
  const distance = targetPoint.distanceTo(new Vector3(...start));
  if (isDebugging) {
    console.log('Moving to point:', targetPoint.toArray(), distance, movementSpeed);
  }
  await spring.start(targetPoint.toArray(), {
    immediate: false,
    config: {
      duration: calculateMovingSpeed(distance, movementSpeed)
    },
    onRest: () => {
      console.log('Finished moving to point:', targetPoint.toArray());
    }
  })
}

export const isTouching = (thisId: number, targetName: string, scene: Scene) => {
  const thisMesh = getScriptEntity(scene, thisId) as Group;
  const targetMesh = scene.getObjectByName(targetName) as Group;

  if (!thisMesh || !targetMesh) {
    console.warn('Error checking if touching:', thisId, thisMesh, targetMesh);
    return false;
  }

  const thisPosition = thisMesh.getWorldPosition(new Vector3());
  const targetPosition = targetMesh.getWorldPosition(new Vector3());

  return thisPosition.distanceTo(targetPosition) < 0.25;
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
