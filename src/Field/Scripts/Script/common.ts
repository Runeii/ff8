import { SpringValue } from "@react-spring/web";
import useGlobalStore from "../../../store";
import { getScriptEntity } from "./Model/modelUtils";
import { openMessage } from "./utils";
import { Group, Object3D, Scene, Vector3 } from "three";

export const displayMessage = async (id: number, x: number, y: number, channel: number, width?: number, height?: number, isCloseable = true) => {
  const { availableMessages } = useGlobalStore.getState();

  const uniqueId = `${id}--${Date.now()}`;
  await openMessage(uniqueId, availableMessages[id], {
    x,
    y,
    channel,
    width,
    height,
  }, isCloseable, undefined);
}

export const isTouching = (thisId: number, targetName: string, scene: Scene) => {
  const thisMesh = getScriptEntity(scene, thisId) as Group;
  const targetMesh = scene.getObjectByName(targetName) as Group;

  if (!thisMesh || !targetMesh) {
    return false;
  }

  const thisPosition = thisMesh.getWorldPosition(new Vector3());
  const targetPosition = targetMesh.getWorldPosition(new Vector3());

  return thisPosition.distanceTo(targetPosition) < 0.07;
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
  16: 'w', // 'Cancel'
  32: '', // 'Menu'
  64: ' ', // 'OK/Accept'
  128: '', //'Card game button'

  // Used by KEYON
  192: ' ', // 'OK/Accept',

  4096: 'ArrowUp',
  32768: 'ArrowLeft',
  16384: 'ArrowDown',
  8192: 'ArrowRight',
} as const;

let DOWN: string[] = [];
let KEYS_PRESSED: string[] = [];
export const isKeyDown = (keyFlag: keyof typeof KEY_FLAGS) => {
  return DOWN.includes(KEY_FLAGS[keyFlag]);
}

export const wasKeyPressed = (keyFlag: keyof typeof KEY_FLAGS) => {
  const key = KEY_FLAGS[keyFlag];
  if (!key) {
    return false;
  }
  const wasPressed = KEYS_PRESSED.includes(key);
  if (wasPressed) {
    KEYS_PRESSED = KEYS_PRESSED.filter(k => k !== key);
  }
  return wasPressed;
}
const keydownListener = (event: KeyboardEvent) => {
  const { currentMessages } = useGlobalStore.getState();
  if (currentMessages.length > 0) {
    return;
  }
  DOWN.push(event.key);
  if (KEYS_PRESSED.includes(event.key)) {
    return;
  }
  KEYS_PRESSED.push(event.key);
}

const keyupListener = (event: KeyboardEvent) => {
  DOWN = DOWN.filter(key => key !== event.key);
}

export const attachKeyDownListeners = () => {
  window.addEventListener('keydown', keydownListener);
  window.addEventListener('keyup', keyupListener);
}

export const setCameraAndLayerScroll = async (x: number, y: number, duration: number, layerIndex?: number) => {
  const currentTransition =
    layerIndex === undefined
    ? useGlobalStore.getState().cameraScrollOffset
    : useGlobalStore.getState().layerScrollOffsets[layerIndex];

  const transition: CameraScrollTransition = {
    startX: currentTransition?.endX ?? 0,
    startY: currentTransition?.endY ?? 0,
    endX: x,
    endY: y,
    duration,
    isInProgress: true
  }

  console.trace('Camera and layer scroll set:', { x, y, duration, layerIndex });

  if (layerIndex === undefined) {
    useGlobalStore.setState({ cameraScrollOffset: transition });
    return;
  }

  useGlobalStore.setState({
    layerScrollOffsets: {
      ...useGlobalStore.getState().layerScrollOffsets,
      [layerIndex!]: transition
    }
  });
}

// This could probably smooth out resetting any set X/Ys
export const setCameraAndLayerFocus = (object: Object3D | null, duration: number) => {
  const { layerScrollOffsets } = useGlobalStore.getState();
  Object.keys(layerScrollOffsets).forEach((layerIndex) => {
    setCameraAndLayerScroll(0, 0, duration, Number(layerIndex));
  });
  console.log('Layer focus reset', object);

  setCameraAndLayerScroll(0, 0, duration);
  useGlobalStore.setState({
    cameraFocusObject: object ?? undefined,
  })
}