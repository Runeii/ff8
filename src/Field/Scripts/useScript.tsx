import { useFrame } from "@react-three/fiber";
import { executeOpcodes } from "./scriptUtils";
import { Script } from "./types";
import { useEffect, useRef } from "react";

function useScript<T>(
  script: Script,
  methodId: string,
  options: {
    condition?: boolean | undefined;
    trigger?: string;
    once?: boolean;
    onComplete?: (finalResult: T) => void;
  } = {},
): T | undefined {
  const currentResult = useRef<T | undefined>(undefined);

  const isProcessingRef = useRef(false);
  const wasPreviouslyTrue = useRef(false);

  const isKeyDownRef = useRef(false);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === options.trigger) {
        isKeyDownRef.current = true;
      }
    }
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === options.trigger) {
        isKeyDownRef.current = false;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    }
  }, [options.trigger]);

  // Find the handler for the specified methodId
  const handler = script.methods.find((method) => method.methodId === methodId);
  // Processing function, potentially async
  const process = async () => {
    if (!handler) {
      return;
    }

    currentResult.current = await executeOpcodes<T>(handler.opcodes, currentResult.current ?? {});
    options.onComplete?.(currentResult.current);
    isProcessingRef.current = false;
  }

  // Frame-by-frame execution
  useFrame(() => {
    if (!handler || isProcessingRef.current || (options.trigger && !isKeyDownRef.current)) {
      return;
    }

    const currentConditionState = options.condition ?? true;
    if (!currentConditionState && wasPreviouslyTrue.current) {
      wasPreviouslyTrue.current = false;
    }

    if (!currentConditionState || (wasPreviouslyTrue.current && options.once)) {
      return;
    }

    wasPreviouslyTrue.current = currentConditionState;
    isProcessingRef.current = true;
    
    process();
  });

  // Return the current result if available
  return currentResult.current as T | undefined;
}

export default useScript;
