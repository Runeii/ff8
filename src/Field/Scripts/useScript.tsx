import { useFrame } from "@react-three/fiber";
import { executeOpcodes } from "./scriptUtils";
import { Script } from "./types";
import { useRef, useState } from "react";

type ScriptOptions = {
  condition?: boolean | undefined;
  once?: boolean;
  onComplete?: () => void;
}

function useScript<T>(
  script: Script,
  methodId: string,
  options: ScriptOptions = {},
  onResult?: (result: T | undefined) => T | void
): T | undefined {
  // Use state to store the result of type R or undefined initially
  const [currentResult, setCurrentResult] = useState<T | undefined>(undefined);

  const isHaltedRef = useRef(false);
  const isProcessingRef = useRef(false);
  const wasPreviouslyTrue = useRef(false);

  // Find the handler for the specified methodId
  const handler = script.methods.find((method) => method.methodId === methodId);

  // Processing function, potentially async
  const process = async () => {
    if (!handler) {
      return;
    }

    // Execute the opcodes and infer result with optional isHalted flag
    const result = await executeOpcodes<T & { isHalted?: boolean }>(handler.opcodes);
    isHaltedRef.current = result?.isHalted || false;

    // If onResult is provided and result exists, process it
    if (onResult) {
      delete result?.isHalted;
      const updatedResult = onResult(result) ?? result;
      setCurrentResult(updatedResult); // Ensure onResult processes T | undefined
    } else {
      setCurrentResult(undefined);
    }

    // Trigger onComplete if provided
    options.onComplete?.();
    isProcessingRef.current = false;
  };

  // Frame-by-frame execution
  useFrame(() => {
    if (!handler || isHaltedRef.current || isProcessingRef.current) {
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
  return currentResult;
}

export default useScript;
