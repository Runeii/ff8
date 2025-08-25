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

  return thisPosition.distanceTo(targetPosition) < 0.001;
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

const constructScrollTransition = (currentTransition: CameraScrollTransition, newX: number, newY: number, duration: number, positioning: ScrollPositionMode) => {
  const transition: CameraScrollTransition = {
    startX: currentTransition?.endX ?? 0,
    startY: currentTransition?.endY ?? 0,
    endX: newX,
    endY: newY,
    duration,
    positioning,
    isInProgress: true
  }

  return transition;
}

export const setCameraScroll = (x: number, y: number, duration: number, positioning: ScrollPositionMode) => {
  const currentTransition = useGlobalStore.getState().cameraScrollOffset;
  const transition = constructScrollTransition(currentTransition, x, y, duration, positioning);

  useGlobalStore.setState({ cameraScrollOffset: transition });
}

export const setLayerScroll = (layerIndex: number, x: number, y: number, duration: number, positioning: ScrollPositionMode) => {
  setCameraScroll(-x / 2, -y / 2, duration, 'camera');

  const currentTransition = useGlobalStore.getState().layerScrollOffsets[layerIndex!];
  const transition = constructScrollTransition(currentTransition, x / 2, y / 2, duration, positioning);

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
    setLayerScroll(Number(layerIndex), 0, 0, duration, 'camera');
  });
  console.log('Layer focus reset', object);

  setCameraScroll(0, 0, duration, 'camera');
  useGlobalStore.setState({
    cameraFocusObject: object ?? undefined,
  })
}