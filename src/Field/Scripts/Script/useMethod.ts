import { useEffect, useMemo,  useRef,  useState } from "react";
import { Script } from "../types";
import { ScriptStateStore } from "./state";
import { OPCODE_HANDLERS } from "./handlers";
import { useThree } from "@react-three/fiber";
import { createAnimationController } from "./AnimationController";

const useMethod = ({
  key,
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
  key?: string,
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
  
  const [STACK, setSTACK] = useState([]);
  const [TEMP_STACK, setTEMP_STACK] = useState({});

  // Index of current opcode being executed
  const [currentOpcodeIndex, setCurrentOpcodeIndex] = useState(0);

  useEffect(() => {
    if (!isActive) {
      return;
    }
    return () => {
      setCurrentOpcodeIndex(0);
    }
  }, [isActive, key, method]);

  const currentOpcode = useMemo(() => {
    if (!method?.opcodes[currentOpcodeIndex]) {
      return;
    }
    return {
      ...method.opcodes[currentOpcodeIndex],
      index: currentOpcodeIndex,
    };
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
    if (!isPaused) {
      return;
    }
    
    const state = useScriptStateStore.getState();
    state.position.stop();
    const currentAngle = state.angle.get();
    const currentHeadAngle = state.headAngle.get();
    state.angle.stop();
    state.headAngle.stop();

    return () => {
      state.angle.start(currentAngle);
      state.headAngle.start(currentHeadAngle);
    }
  }, [currentOpcodeIndex, isDebugging, isPaused, methodId, useScriptStateStore]);

  // We use this to ensure we discard the results if state changes while we're executing
  const loopKeyRef = useRef<string>('');
  useEffect(() => {
    loopKeyRef.current = `${Date.now()}-${isActive}-${isPaused}`
  }, [isActive, isPaused])

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
      const startLoopKey = loopKeyRef.current;
      const state = useScriptStateStore.getState();

      const FROZEN_STACK = [...STACK];
      const FROZEN_TEMP_STACK = { ...TEMP_STACK };
    
      const handler = OPCODE_HANDLERS[currentOpcode.name];
      const nextIndex = await handler({
        animationController,
        currentOpcode,
        currentState: state,
        currentOpcodeIndex: method.opcodes.indexOf(currentOpcode),
        isDebugging,
        opcodes: method.opcodes,
        scene,
        script,
        STACK: FROZEN_STACK,
        TEMP_STACK: FROZEN_TEMP_STACK,
      });

      if (isPaused || loopKeyRef.current !== startLoopKey) {
        // If we're paused, we do not continue to the next opcode. We will reexecute this opcode when we resume
        return;
      }

      setSTACK(FROZEN_STACK);
      setTEMP_STACK(FROZEN_TEMP_STACK);
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
  }, [STACK, TEMP_STACK, animationController, currentOpcode, isActive, isDebugging, isExecutableMethod, isLooping, isPaused, method, methodId, scene, script, useScriptStateStore]);

  
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