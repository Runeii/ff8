import { useFrame } from "@react-three/fiber";
import { executeOpcodes } from "./opcodes/executor";
import { Script } from "./types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function useScript<T>(
  script: Script,
  methodId: string,
  onUpdate: (latestResult: Partial<T>) => void,
  options: {
    condition?: boolean;
    trigger?: string;
    once?: boolean;
  } = {},
 ) {
  const [hasCompleted, setHasCompleted] = useState(false);
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const isProcessingRef = useRef(false);
  const isHaltedRef = useRef(false);
  const wasPreviouslyTrue = useRef(false);

  const isConditionTrueRef = useRef<boolean>(!(options.condition === false));
  useEffect(() => {
    isConditionTrueRef.current = !(options.condition === false)
  }, [options]);

  // Find the handler for the specified methodId
  const handler = useMemo(() => {
    const method = script.methods.find((method) => method.methodId === methodId);
    const hasUsefulActions = method?.opcodes.some((opcode) => opcode.name !== 'LBL' && opcode.name !== 'RET' && opcode.name !== 'HALT');

    if (!method || !hasUsefulActions) {
      return undefined;
    }

    return method;
  }, [script, methodId]);

  const execution = useCallback(async () => {
    if (!handler || isProcessingRef.current || isHaltedRef.current) {
      return;
    }

    const currentConditionState = options.condition === undefined ? true : options.condition;
    if (!currentConditionState && wasPreviouslyTrue.current) {
      wasPreviouslyTrue.current = false;
    }

    if (!currentConditionState || (wasPreviouslyTrue.current && options.once)) {
      return;
    }

    wasPreviouslyTrue.current = currentConditionState;
    isProcessingRef.current = true;

    await executeOpcodes<T>(
      handler.opcodes,
      isConditionTrueRef,
      isHaltedRef,
      onUpdateRef
    );

    isProcessingRef.current = false;
    setHasCompleted(true);
  }, [handler, options.condition, options.once]);

  // Frame-by-frame execution
  useFrame(() => {
    if (options.trigger) {
      return;
    }

    execution();
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === options.trigger) {
        execution();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    }
  }, [execution, options.trigger]);

  return hasCompleted;
}

export default useScript;
