import { useEffect, useMemo,  useRef,  useState } from "react";
import { Script } from "../types";
import { ScriptStateStore } from "./state";
import { OPCODE_HANDLERS } from "./handlers";
import { useThree } from "@react-three/fiber";
import { createAnimationController } from "./AnimationController";

const useMethod = ({
  methodId,
  isActive,
  isLooping,
  isPaused,
  script,
  useScriptStateStore,
  animationController,
  isDebugging = false,
  onComplete,
}: {
  methodId?: string,
  isActive: boolean,
  isLooping: boolean,
  isPaused: boolean,
  script: Script,
  useScriptStateStore: ScriptStateStore,
  animationController: ReturnType<typeof createAnimationController>,
  isDebugging?: boolean,
  onComplete?: () => void,
}) => {
  const scene = useThree((state) => state.scene);

  const method = useMemo(() => {
    return script.methods.find(method => method.methodId === methodId);
  }, [methodId, script.methods]);
  
  // Index of current opcode being executed
  const [currentOpcodeIndex, setCurrentOpcodeIndex] = useState(0);

  useEffect(() => {
    if (!isActive) {
      return;
    }
    return () => {
      setCurrentOpcodeIndex(0);
    }
  }, [isActive, method]);

  const currentOpcode = useMemo(() => {
    return method?.opcodes[currentOpcodeIndex];
  }, [currentOpcodeIndex, method]);

  // If the method is just a label or return, there's no behaviour to execute
  // We avoid running the loop to save on performance
  const isExecutableMethod = useMemo(() => {
    if (!method) {
      return false;
    }
    return method.opcodes.filter(opcode => !opcode.name.startsWith('LABEL') && opcode.name !== 'RET').length > 0;
  }, [method]);


  useEffect(() => {
    if (!isActive || isPaused || !isExecutableMethod || !currentOpcode || !method) {
      return;
    }

    if (isDebugging) {
      console.log('Executing', methodId, currentOpcode)
    }

    if (currentOpcode.name.startsWith('LABEL')) {
      setCurrentOpcodeIndex(currentIndex => currentIndex + 1);
      return;
    }


    const execute = async () => {
      const state = useScriptStateStore.getState();

      const handler = OPCODE_HANDLERS[currentOpcode.name];
      const nextIndex = await handler({
        animationController,
        currentOpcode,
        currentState: state,
        currentOpcodeIndex: method.opcodes.indexOf(currentOpcode),
        opcodes: method.opcodes,
        scene,
        script,
        STACK: state.STACK,
        TEMP_STACK: state.TEMP_STACK,
      });

      useScriptStateStore.setState(state);

      if (nextIndex) {
        setCurrentOpcodeIndex(nextIndex);
        return;
      }

      if (isLooping) {
        setCurrentOpcodeIndex(currentIndex => (currentIndex + 1) % method.opcodes.length);
        return;
      }

      setCurrentOpcodeIndex(currentIndex => currentIndex + 1);
    }
    execute();
  }, [animationController, currentOpcode, isActive, isDebugging, isExecutableMethod, isLooping, isPaused, method, methodId, scene, script, useScriptStateStore]);

  
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  
  const hasCompletedRun = !!(method && (currentOpcodeIndex >= method.opcodes.length && !isLooping));
  useEffect(() => {
    if (!hasCompletedRun) {
      return;
    }
    if (isDebugging) {
      console.log(`Method ${methodId} has completed`);
      console.log('Firing while paused?', isPaused, methodId, currentOpcodeIndex);
    }
    onCompleteRef.current?.();
  }, [hasCompletedRun,currentOpcodeIndex, isPaused, isDebugging, methodId]);
}

export default useMethod;