import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Script, ScriptState } from "../types";
import { OPCODE_HANDLERS } from "./handlers";
import { useFrame, useThree } from "@react-three/fiber";

const DEFAULT_STATE: ScriptState = {
  animation: {
    id: 0,
    isHoldingFinalFrame: false,
    isLooping: false,
  },
  idleAnimationId: 0,

  backgroundAnimationSpeed: 0,
  backgroundStartFrame: 0,
  backgroundEndFrame: 0,
  isBackgroundVisible: true,
  isBackgroundLooping: false,

  isLineOn: true,
  linePoints: null,

  isVisible: true,
  isSolid: false,
  isUnused: false,

  modelId: 0,
  partyMemberId: 0,

  pushRadius: 0,
  talkRadius: 200,
  isPushable: false,
  isTalkable: true,

  angle: 0,
  position: [0, 0, 0],
  movementDuration: 0,
  movementSpeed: 0,
}
const useMethod = (script: Script, activeMethodId: number | undefined, setActiveMethodId: (methodId?: number) => void) => {
  const scene = useThree((state) => state.scene);

  const currentScriptStateRef = useRef<ScriptState>({ ...DEFAULT_STATE });
  const [scriptState, setScriptState] = useState<ScriptState>({ ...DEFAULT_STATE });
  useFrame(() => {
    setScriptState(currentScriptStateRef.current);
  });

  const [hasCompletedConstructor, setHasCompletedConstructor] = useState(false);
  const [currentOpcodeIndex, setCurrentOpcodeIndex] = useState(0);

  const [previousActiveMethodName, setPreviousActiveMethodName] = useState<string>();

  const STACKRef = useRef<number[]>([]);
  const TEMP_STACKRef = useRef<Record<number, number>>({});

  useEffect(() => {
    return () => {
      setCurrentOpcodeIndex(0);
      STACKRef.current = [];
      TEMP_STACKRef.current = {};
    }
  }, [activeMethodId, hasCompletedConstructor]);

  const activeMethod = useMemo(() => {
    const [constructor, ...methods] = script.methods;

    if (!hasCompletedConstructor) {
      return constructor
    }

    if (activeMethodId) {
      return methods.find(method => method.scriptLabel === activeMethodId);
    }

    if (previousActiveMethodName === 'touchon') {
      return methods.find(method => method.methodId === 'touch');
    }

    return methods.find(method => method.methodId === 'default');
  }, [activeMethodId, hasCompletedConstructor, previousActiveMethodName, script.methods]);

  const handleCompleteRun = useCallback(() => {
    if (!activeMethodId || !activeMethod) {
      return;
    }

    setPreviousActiveMethodName(activeMethod.methodId);
    setActiveMethodId(undefined);
  }, [activeMethod, activeMethodId, setActiveMethodId]);

  const thisRunMethodId = useRef<string>();
  useEffect(() => {
    if (!activeMethod) {
      return;
    }

    const { methodId, opcodes } = activeMethod;

    if (thisRunMethodId.current && methodId !== thisRunMethodId.current && currentOpcodeIndex > 0) {
      return;
    }

    thisRunMethodId.current = methodId;

    const goToNextOpcode = () => {
      const isLooping = methodId === 'default' || methodId === 'touch';
      if (isLooping) {
        setCurrentOpcodeIndex((currentOpcodeIndex + 1) % opcodes.length);
        return;
      }
      setCurrentOpcodeIndex(currentOpcodeIndex + 1);
    }

    const execute = async () => {
      const currentOpcode = opcodes[currentOpcodeIndex] ?? undefined;

      if (!currentOpcode && !hasCompletedConstructor) {
        setHasCompletedConstructor(true);
      }

      if (!currentOpcode) {
        handleCompleteRun();
        return;
      }

      if (currentOpcode.name.startsWith('LABEL')) {
        goToNextOpcode();
        return;
      }

      const handler = OPCODE_HANDLERS[currentOpcode.name];
      if (!handler) {
        console.warn(`No handler for opcode ${currentOpcode.name}. Param: ${currentOpcode.param}`, `Method: ${opcodes[0].param}.`);
        goToNextOpcode();
        return;
      }

      const nextIndex = await handler({
        activeMethod,
        currentOpcode,
        opcodes,
        currentStateRef: currentScriptStateRef,
        scene,
        script,
        STACK: STACKRef.current,
        TEMP_STACK: TEMP_STACKRef.current,
      });

      if (nextIndex) {
        setCurrentOpcodeIndex(nextIndex);
      } else {
        goToNextOpcode();
      }
    }

    execute();
  }, [activeMethod, activeMethodId, currentOpcodeIndex, handleCompleteRun, hasCompletedConstructor, scene, script]);

  return scriptState;
}

export default useMethod;