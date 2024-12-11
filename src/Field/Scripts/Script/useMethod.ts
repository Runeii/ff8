import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Script } from "../types";
import { OPCODE_HANDLERS } from "./handlers";
import { useThree } from "@react-three/fiber";
import useGlobalStore from "../../../store";
import { ScriptStateStore } from "./state";
import { createAnimationController } from "./AnimationController";

const useMethod = (
  script: Script,
  useScriptStateStore: ScriptStateStore,
  activeMethodId: string | undefined,
  setActiveMethodId: (methodId?: string) => void,
  isActive: boolean,
  animationController: ReturnType<typeof createAnimationController>,
) => {
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    window.setTimeout(() => {
      useScriptStateStore.setState(state => ({
        ...state,
        spuValue: state.spuValue + 1,
      }));
    }, 1000);
  }, [useScriptStateStore]);

  const isHalted = useScriptStateStore(state => state.isHalted)
  const isUnused = useScriptStateStore(state => state.isUnused)

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

    if (!isActive) {
      return null;
    }

    const touch = methods.find(method => method.methodId === 'touch');
    if (previousActiveMethodName === 'touchon' && touch) {
      return touch;
    }

    const across = methods.find(method => method.methodId === 'across');

    if (previousActiveMethodName === 'touchoff' && across) {
      return across;
    }

    if (isHalted) {
      return null;
    }

    return methods.find(method => method.methodId === 'default');
  }, [activeMethodId, hasCompletedConstructor, isActive, isHalted, previousActiveMethodName, script.methods]);

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

    if (useScriptStateStore.getState().hasRemovedControl) {
      useScriptStateStore.setState({ hasRemovedControl: false });
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
  }, [activeMethod, activeMethodId, script.type, setActiveMethodId, useScriptStateStore]);

  const isLooping = useMemo(() => activeMethod?.methodId === 'default' || activeMethod?.methodId === 'touch', [activeMethod]);

  const thisRunMethodId = useRef<string>();
  useEffect(() => {
    if (!activeMethod) {
      return;
    }

    const { methodId, opcodes } = activeMethod;

    // If the script is unused, we can skip the constructor
    if (isUnused) {
      setHasCompletedConstructor(true);
      handleCompleteRun();
      return;
    }

    if (thisRunMethodId.current && methodId !== thisRunMethodId.current && currentOpcodeIndex > 0) {
      return;
    }

    thisRunMethodId.current = methodId;

    const goToNextOpcode = () => {
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
      if (script.groupId === 23) {
        //  console.log('next:', currentOpcodeIndex, currentOpcode);
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

      const slowRunMonitor = setTimeout(() => {
        console.warn(`Slow run: ${currentOpcode.name}. Param: ${currentOpcode.param}`, `Method: ${opcodes[0].param}.`);
      }, 2000);

      const state = useScriptStateStore.getState();

      const nextIndex = await handler({
        activeMethod,
        animationController,
        currentOpcode,
        currentState: state,
        currentOpcodeIndex,
        opcodes,
        scene,
        script,
        STACK: STACKRef.current,
        TEMP_STACK: TEMP_STACKRef.current,
      });

      useScriptStateStore.setState(state);

      clearInterval(monitor);
      clearTimeout(slowRunMonitor);
      if (methodId !== thisRunMethodId.current) {
        return;
      }

      if (nextIndex && nextIndex > 9000 && isLooping) {
        goToNextOpcode();
        return;
      }
      if (nextIndex) {
        setCurrentOpcodeIndex(nextIndex);
      } else {
        goToNextOpcode();
      }
    }

    execute();
  }, [activeMethod, activeMethodId, currentOpcodeIndex, handleCompleteRun, hasCompletedConstructor, isLooping, isUnused, scene, script, useScriptStateStore]);

  return hasCompletedConstructor;
}

export default useMethod;