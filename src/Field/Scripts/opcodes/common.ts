import { MutableRefObject } from "react";
import useGlobalStore from "../../../store";
import { OpcodeObj } from "../types";
import { executeOpcodes } from "./executor";
import { Scene } from "three";

export const KEYS: Record<number, string> = {
  192: 'Space'
}

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const waitForKeyPress = (key: number) => {
  return new Promise<void>((resolve) => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === KEYS[key]) {
        window.removeEventListener('keydown', handleKeyPress);
        resolve();
      }
    }

    window.addEventListener('keydown', handleKeyPress);
  });
}

export const remoteExecute = async (labelId: number, sceneRef: MutableRefObject<Scene>) => {
  const { fieldScripts } = useGlobalStore.getState()
  const targetScript = fieldScripts.find(script => script.methods.some(method => method.scriptLabel === labelId));
  const targetMethod = targetScript?.methods.find(method => method.scriptLabel === labelId);

  if (!targetScript || !targetMethod) {
    console.warn('Could not find script or method with labelId', labelId);
    return;
  }
  console.log('Executing!', targetScript, targetMethod, labelId);
  await executeOpcodes(
    targetMethod.opcodes,
    { current: true },
    { current: false },
    sceneRef,
    { current: (...result) => console.log('remote execute result', result) }
  );
  return;
}

export const dummiedCommand = () => {
  //console.warn('Command is dummied', opcodeObj);
}

export const unusedCommand = (opcodeObj: OpcodeObj) => {
  console.warn('Command was never used in game.', opcodeObj);
}
