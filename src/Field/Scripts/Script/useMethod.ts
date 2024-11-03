import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Script, ScriptState } from "../types";
import { OPCODE_HANDLERS } from "./handlers";
import { useFrame, useThree } from "@react-three/fiber";
import useGlobalStore from "../../../store";
import { Vector3 } from "three";
import { SpringRef } from "@react-spring/web";

const DEFAULT_STATE: ScriptState = {
  hasRemovedControl: false,
  isHalted: false,

  animation: {
    id: 0,
    isHoldingFinalFrame: false,
    isLooping: false,
  },
  idleAnimationId: 0,

  backgroundAnimationSpeed: 0,
  backgroundStartFrame: 0,
  backgroundEndFrame: 0,
  isBackgroundVisible: false,
  isBackgroundLooping: false,

  isLineOn: true,
  linePoints: null,

  isVisible: true,
  isSolid: false,
  isUnused: false,

  modelId: 0,
  partyMemberId: undefined,

  pushRadius: 0,
  talkRadius: 200,
  isPushable: false,
  isTalkable: true,

  angle: 0,
  position: new Vector3(0, 0, 0),
  movementDuration: 0,
  movementSpeed: 0,

  isDoorOn: true,

  backroundMusicId: 0,
  backgroundMusicVolume: 127,
  isPlayingBackgroundMusic: false,
}

const useMethod = (
  script: Script,
  activeMethodId: string | undefined,
  setActiveMethodId: (methodId?: string) => void,
  movementSpring: SpringRef<{ position: number[]; }>,
) => {
  const scene = useThree((state) => state.scene);

  const currentScriptStateRef = useRef<ScriptState>({ ...DEFAULT_STATE });
  const [scriptState, setScriptState] = useState<ScriptState>({ ...DEFAULT_STATE });
  useFrame(() => {
    setScriptState({ ...currentScriptStateRef.current });
  });

  const [hasCompletedConstructor, setHasCompletedConstructor] = useState(false);

  const [previousActiveMethodName, setPreviousActiveMethodName] = useState<string>();

  const activeMethod = useMemo(() => {
    const [constructor, ...methods] = script.methods;

    if (!hasCompletedConstructor) {
      return constructor
    }

    if (activeMethodId) {
      return methods.find(method => method.methodId === activeMethodId);
    }

    const touch = methods.find(method => method.methodId === 'touch');
    if (previousActiveMethodName === 'touchon' && touch) {
      return touch;
    }

    const across = methods.find(method => method.methodId === 'across');

    if (previousActiveMethodName === 'touchoff' && across) {
      return across;
    }

    if (currentScriptStateRef.current.isHalted) {
      return null;
    }

    return methods.find(method => method.methodId === 'default');
  }, [activeMethodId, hasCompletedConstructor, previousActiveMethodName, script.methods]);

  const [currentOpcodeIndex, setCurrentOpcodeIndex] = useState(0);

  const STACKRef = useRef<number[]>([]);
  const TEMP_STACKRef = useRef<Record<number, number>>({});

  useEffect(() => {
    return () => {
      setCurrentOpcodeIndex(0);
      STACKRef.current = [];
      TEMP_STACKRef.current = {};
    }
  }, [activeMethodId, hasCompletedConstructor]);

  const handleCompleteRun = useCallback(() => {
    if (!activeMethodId || !activeMethod) {
      return;
    }

    if (currentScriptStateRef.current.hasRemovedControl) {
      useGlobalStore.setState({ isUserControllable: true });
    }

    // Doors behave differently and do not return to default loop
    const isDoorOpenOrCloseState = script.type === 'door' && (activeMethodId === 'open' || activeMethodId === 'close');

    if (isDoorOpenOrCloseState) {
      return;
    }

    useGlobalStore.setState({ hasActiveTalkMethod: false });
    setPreviousActiveMethodName(activeMethod.methodId);
    setActiveMethodId(undefined);
  }, [activeMethod, activeMethodId, script.type, setActiveMethodId]);

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

      if (script.groupId === 10) {
        // console.log(currentOpcode, currentOpcodeIndex);
      }
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

      const abortController = new AbortController();

      const monitor = setInterval(() => {
        if (thisRunMethodId.current !== methodId) {
          abortController.abort();
          clearInterval(monitor);
        }
      }, 50);

      const nextIndex = await handler({
        activeMethod,
        currentOpcode,
        opcodes,
        currentStateRef: currentScriptStateRef,
        movementSpring,
        scene,
        script,
        signal: abortController.signal,
        STACK: STACKRef.current,
        TEMP_STACK: TEMP_STACKRef.current,
      });

      clearInterval(monitor);

      if (methodId !== thisRunMethodId.current) {
        return;
      }

      if (nextIndex) {
        setCurrentOpcodeIndex(nextIndex);
      } else {
        goToNextOpcode();
      }
    }

    execute();
  }, [activeMethod, activeMethodId, currentOpcodeIndex, handleCompleteRun, hasCompletedConstructor, scene, script, movementSpring]);

  return scriptState;
}

export default useMethod;