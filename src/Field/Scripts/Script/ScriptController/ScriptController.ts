  import { create } from "zustand";
  import type { Script, ScriptMethod } from "../../types";
  import { Scene } from "three";
  import createMovementController from "../MovementController/MovementController";
  import { createAnimationController } from "../AnimationController/AnimationController";
  import createRotationController from "../RotationController/RotationController";
  import createScriptState from "../state";
  import createSFXController from "../SFXController/SFXController";
import { OPCODE_HANDLERS } from "../handlers";
import { sendToDebugger } from "../../../../Debugger/debugUtils";

type QueueItem = {
  activeOpcodeIndex: number;
  method: ScriptMethod;
  isLooping: boolean;
  priority: number;
  uniqueId: string;
}

const createScriptController = ({
  script,
  scene,
  headController,
  rotationController,
  animationController,
  movementController,
  sfxController,
  useScriptStateStore,
}: {
  script: Script;
  scene: Scene;
  headController: ReturnType<typeof createRotationController>;
  rotationController: ReturnType<typeof createRotationController>;
  animationController: ReturnType<typeof createAnimationController>;
  movementController: ReturnType<typeof createMovementController>;
  sfxController: ReturnType<typeof createSFXController>;
  useScriptStateStore: ReturnType<typeof createScriptState>;
}) => {
  let STACK: number[] = [];
  let TEMP_STACK = {};

  const { getState, setState, subscribe } = create(() => ({
    abortController: new AbortController(),
    isProcessingAQueueItem: false,
    queue: [] as QueueItem[],
    script,
  }));

  subscribe(state => {
    const {abortController, ...safeState} = state;
    sendToDebugger('script-controller-state', JSON.stringify({
      ...safeState,
      queue: safeState.queue.map(item => ({
        ...item,
        // We don't want to send the opcodes as they can be large and are not needed
        method: {
          ...item.method,
          opcodes: [],
          opcodesDebug: [],
        },
      })),
      script: {
        groupId: safeState.script.groupId,
      }
    }));
  });

  const triggerMethodByIndex = async (methodIndex: number, priority = 10) => {
    const method = script.methods[methodIndex]
    if (!method) {
      console.trace(`Method with index ${methodIndex} not found in script for ${script.groupId}`);
      return;
    }
    await triggerMethod(method.methodId, priority);
  }
  
  const triggerMethod = async (methodId: string, priority = 10) => {
    const method = script.methods.find(method => method.methodId === methodId);
    if (!method) {
      console.warn(`Method with id ${methodId} not found in script for ${script.groupId}`);
      return;
    }

    const currentQueue = getState().queue;
    if (currentQueue.find(item => item.method.methodId === methodId)) {
      return;
    }

    const isValidActionableMethod = method.opcodes.filter(opcode => !opcode.name.startsWith('LABEL') && opcode.name !== 'LBL' && opcode.name !== 'RET' && opcode.name !== 'HALT').length > 0;

    if (!isValidActionableMethod) {
      console.warn('Method is not actionable:', method);
      return;
    }

    const uniqueId = `${script.groupId}-${methodId}--${priority}-${Date.now()}`;
    const isLooping = method.methodId === "default"

    addToQueue({
      activeOpcodeIndex: 0,
      method,
      isLooping,
      priority,
      uniqueId,
    })

    return new Promise<void>((resolve) => {
      const handler = ({ detail }: { detail: string}) => {
        if (detail === uniqueId) {
          document.removeEventListener('scriptEnd', handler);
          resolve();
        }
      };
      document.addEventListener('scriptEnd', handler);
    })
  }

  const addToQueue = (newItem: QueueItem) => {
    const currentQueue = getState().queue;
    const isCurrentlyProcessingQueueItem = getState().isProcessingAQueueItem;

    const newQueue = [...currentQueue];

    // 0 is highest
    const insertAtIndex = newQueue.findIndex(item => item.priority > newItem.priority);
    const isTopPriority = insertAtIndex === -1;

    if (isTopPriority) {
      newQueue.unshift(newItem);
    } else {
      newQueue.splice(insertAtIndex, 0, newItem);
    }

    setState({ queue: newQueue });

    if (isCurrentlyProcessingQueueItem && isTopPriority) {
      getState().abortController.abort();
    }
  }

  const removeQueueItem = (uniqueId: string) => {
    const currentQueue = getState().queue;
    const newQueue = currentQueue.filter(item => item.uniqueId !== uniqueId);
    
    setState({
      isProcessingAQueueItem: false,
      queue: newQueue
    });

    const event = new CustomEvent('scriptEnd', {
      detail: uniqueId
    });
    document.dispatchEvent(event);
  }

  const updateQueueItem = (queueItem: QueueItem) => {
    const currentQueue = getState().queue;
    const newQueue = currentQueue.map(item => {
      if (item.uniqueId === queueItem.uniqueId) {
        return queueItem;
      }
      return item;
    });
    setState({ 
      isProcessingAQueueItem: false,
      queue: newQueue
    });
  }

  const tick = async () => {
    const {queue: __queue, isProcessingAQueueItem} = getState();
    const queueSnapshot = structuredClone(__queue);

    if (isProcessingAQueueItem || queueSnapshot.length === 0) {
      return;
    }

    setState({ isProcessingAQueueItem: true });

    const queueItem = queueSnapshot[0];

    const { activeOpcodeIndex, method } = queueItem;

    // Refresh aborted abort controller as we're resuming a previous item
    if (getState().abortController.signal.aborted) {
      setState({
        abortController: new AbortController()
      })
    }

    const activeOpcode = method.opcodes[activeOpcodeIndex];

    sendToDebugger('opcode', JSON.stringify({
      id: script.groupId,
      methodId: method.methodId,
      index: activeOpcodeIndex,
      opcode: activeOpcode,
      message: 'in'
    }))

    if (activeOpcode.name.startsWith('LABEL')) {
      handleTickCleanup(queueItem.activeOpcodeIndex + 1, queueSnapshot)
      return;
    }

    if (activeOpcode.name === 'HALT') {
      handleTickCleanup(-2, queueSnapshot);
      return;
    }

    const opcodeHandler = OPCODE_HANDLERS[activeOpcode.name];
    const currentState = useScriptStateStore.getState();

    // If this next action is cancelled, we want to be able to discard
    // our changes to ensure we can repeat in the future
    const clonedStack = [...STACK];
    const clonedTempStack = {...TEMP_STACK};

    const promise = opcodeHandler({
      animationController,
      currentOpcode: activeOpcode,
      currentOpcodeIndex: activeOpcodeIndex,
      currentState,
      headController,
      movementController,
      opcodes: method.opcodes,
      rotationController,
      scene,
      script,
      setState: useScriptStateStore.setState,
      sfxController,
      STACK: clonedStack,
      TEMP_STACK: clonedTempStack,
    });

    sendToDebugger('opcode', JSON.stringify({
      id: script.groupId,
      methodId: method.methodId,
      index: activeOpcodeIndex,
      opcode: activeOpcode,
      message: 'race'
    }))
    const nextIndex = await Promise.race([
      promise,
      new Promise<Error>((resolve) => {
        getState().abortController.signal.addEventListener('abort', () => {
          resolve(new Error('Aborted'));
        });
      })
    ]);

    if (nextIndex instanceof Error) {
      handlePause();
      return;
    }

    sendToDebugger('opcode', JSON.stringify({
      id: script.groupId,
      methodId: method.methodId,
      index: activeOpcodeIndex,
      opcode: activeOpcode,
      message: 'done'
    }))
    STACK = clonedStack;
    TEMP_STACK = clonedTempStack;

    handleTickCleanup(nextIndex, queueSnapshot)
  }

  const handleTickCleanup = (nextIndex: number | void, queueSnapshot: QueueItem[]) => {
    const updatedQueueItem = structuredClone(queueSnapshot[0]);

    // Halt
    if (nextIndex === -2) {
      removeQueueItem(updatedQueueItem.uniqueId);
      return;
    }

    // Return and not looping
    if (nextIndex === -1 && !updatedQueueItem.isLooping) {
      removeQueueItem(updatedQueueItem.uniqueId);
      return;
    }
    
    // Return if looping
    if (nextIndex === -1) {
      updatedQueueItem.activeOpcodeIndex = 0;
    }

    updatedQueueItem.activeOpcodeIndex = nextIndex ?? updatedQueueItem.activeOpcodeIndex + 1;

    if (updatedQueueItem.activeOpcodeIndex >= updatedQueueItem.method.opcodes.length) {
      removeQueueItem(updatedQueueItem.uniqueId);
      return;
    }
    
    updateQueueItem(updatedQueueItem);
  }

  const handlePause = () => {
    movementController.pause();

    setState({
      isProcessingAQueueItem: false,
    })
  }

  const isTalkingToPlayer = () => getState().queue[0]?.method.methodId === 'talk';

  return {
    script,
    tick,
    triggerMethod,
    isTalkingToPlayer,
    triggerMethodByIndex,
  }
}

export default createScriptController;