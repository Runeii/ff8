import { useFrame } from "@react-three/fiber";
import { executeOpcodes } from "./scriptUtils";
import { Script } from "./types";
import { useEffect, useRef, useState } from "react";

type ScriptOptions = {
  condition?: boolean | undefined;
  once?: boolean;
  onComplete?: () => void;
}

function useScript<T>(script: Script, methodId: string, options: ScriptOptions, onResult?: (result?: object) => T): T {
  const [currentResult, setCurrentResult] = useState<T>();

  const isHaltedRef = useRef(false);
  const isProcessingRef = useRef(false);

  const wasPreviouslyTrue = useRef(false);

  const handler = script.methods.find((method) => method.methodId === methodId);

  // We need to be able to await results from the script execution
  const process = async () => {
    const result = await executeOpcodes<{isHalted?: boolean, waitingForKeyPress?: number, [key: string]: unknown}>(handler.opcodes);
    isHaltedRef.current = result && result.isHalted ? true : false;

    if (onResult) {
      setCurrentResult(onResult(result));
    }

    if (options.onComplete) {
      options.onComplete();
    }
  
    isProcessingRef.current = false;
  }

  useFrame(() => {
    if (!handler || isHaltedRef.current || isProcessingRef.current) {
      return;
    }

    const currentConditionState = options.condition !== undefined ? options.condition : true;
    if (!currentConditionState && wasPreviouslyTrue.current) {
      wasPreviouslyTrue.current = false;
    }
  
    if (!currentConditionState || wasPreviouslyTrue.current && options.once) {
      return;
    }

    wasPreviouslyTrue.current = currentConditionState;

    isProcessingRef.current = true;
    process();
  });

  return currentResult;
}

export default useScript;