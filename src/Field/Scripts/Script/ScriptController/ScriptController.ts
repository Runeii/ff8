import { create } from "zustand";
import { OpcodeObj, Script } from "../../types";
import { OPCODE_HANDLERS } from "../handlers";
import { Scene } from "three";
import createMovementController from "../MovementController/MovementController";
import { createAnimationController } from "../AnimationController/AnimationController";
import createRotationController from "../RotationController/RotationController";
import createScriptState from "../state";
import createSFXController from "../SFXController/SFXController";

const createScriptController = ({
  script,
  scene,
  headController,
  rotationController,
  animationController,
  movementController,
  sfxController,
  useScriptStateStore,
  isDebugging = false,
}: {
  script: Script;
  scene: Scene;
  headController: ReturnType<typeof createRotationController>;
  rotationController: ReturnType<typeof createRotationController>;
  animationController: ReturnType<typeof createAnimationController>;
  movementController: ReturnType<typeof createMovementController>;
  sfxController: ReturnType<typeof createSFXController>;
  useScriptStateStore: ReturnType<typeof createScriptState>;
  isDebugging?: boolean;
}) => {
  let STACK: number[] = [];
  let TEMP_STACK = {};

  const { getState, setState } = create(() => ({
    isRunning: false,
    queue: [] as {
      activeIndex: number;
      opcodes: OpcodeObj[],
      methodId: string;
      isLooping: boolean;
      priority: number;
      uniqueId: string;
    }[],
    script,
  }));

  const goToNextOpcode = ({
    isHalting = false,
    nextIndex,
  }: {
    nextIndex?: number | void;
    isHalting?: boolean;
  }) => {
    const { queue } = getState();

    const newQueue = [...queue];
    const { isLooping, opcodes, uniqueId } = newQueue.at(-1)!;
    
    const currentQueueItem = newQueue.at(-1)!;

    // If we returned (-1) and this script loops, we need to go back to the start
    if (nextIndex === -1 && isLooping) {
      currentQueueItem.activeIndex = 0;
    }
    // If we passed a specific index, we need to go there
    // This is used for JMP/LABEL opcodes
    else if (nextIndex) {
      currentQueueItem.activeIndex = nextIndex;
    }
    // Otherwise, we just go to the next opcode
    else {
      currentQueueItem.activeIndex += 1;
    }

    // Should we remove this item from the queue and stop the script?
    if (isHalting || currentQueueItem.activeIndex === -1 || (currentQueueItem.activeIndex >= opcodes.length)) {
      newQueue.pop();
    }
    
    // Fire the scriptEnd event if the queue has changed
    // This allows us to await the script end in the triggerMethod function
    if (queue.length !== newQueue.length) {
      const event = new CustomEvent('scriptEnd', {
        detail: uniqueId
      });
      document.dispatchEvent(event);
    }
  
    setState({
      isRunning: false,
      queue: newQueue
    });
  }

  const handleSpecialCaseOpcodes = (currentOpcode: OpcodeObj, activeIndex: number) => {
    if (currentOpcode.name.startsWith('LABEL')) {
      goToNextOpcode({
        nextIndex: activeIndex + 1
      });
      return true;
    }

    if (currentOpcode.name === 'HALT') {
      goToNextOpcode({
        isHalting: true,
      });
      return true;
    }
  }

  const tick = async () => {
    const { isRunning, queue } = getState();

    if (isRunning || queue.length === 0) {
      return;
    }
    setState({ isRunning: true });
    
    const { activeIndex, methodId, opcodes, uniqueId } = queue.at(-1)!;
    const currentOpcode = opcodes[activeIndex];

    if (isDebugging) {
      console.log(`ScriptID: ${script.groupId}x${methodId} - Opcode: ${currentOpcode.name} - Index: ${activeIndex}/${opcodes.length} - Queue: ${queue.map(entry => entry.methodId)} - Stack Length: ${STACK.length} - Temp Stack Length: ${Object.keys(TEMP_STACK).length}`);
    }
    const shouldReturnEarly = handleSpecialCaseOpcodes(currentOpcode, activeIndex);
    if (shouldReturnEarly) {
      return;
    }
    
    const opcodeHandler = OPCODE_HANDLERS[currentOpcode.name];

    // To enable rollbacks when an opcode is cancelled mid process, we need to capture state changes and 
    // only apply them if the script is still running at the end
    const currentState = useScriptStateStore.getState();
    let modifiedState = {};
    const modifiedStateSetter = (arg: Partial<typeof currentState> | ((state: typeof currentState) => Partial<typeof currentState>)) => {
      if (typeof arg === 'function') {
        modifiedState = {
          ...modifiedState,
          ...arg(currentState),
        }
      } else {
        modifiedState = {
          ...modifiedState,
          ...arg,
        }
      }
    }

    const clonedStack = [...STACK];
    const clonedTempStack = {...TEMP_STACK};

    // RUN THAT OPCODE
    const nextIndex = await opcodeHandler({
      animationController,
      currentOpcode,
      currentOpcodeIndex: activeIndex,
      currentState,
      headController,
      isDebugging: false,
      movementController,
      opcodes,
      rotationController,
      scene,
      script,
      setState: modifiedStateSetter,
      sfxController,
      STACK: clonedStack,
      TEMP_STACK: clonedTempStack,
    });

    // If there is a new priority item in the queue, we need to abort the current run and discard changes
    // Springs and controllers were already stopped when the new item was added to the queue
    const currentlyTopOfQueue = getState().queue.at(-1)!;
    if (currentlyTopOfQueue.uniqueId !== uniqueId) {
      setState({ isRunning: false });
      return;
    }

    // Only update the store if state has changed
    if (JSON.stringify(modifiedState) !== '{}') {
      useScriptStateStore.setState(modifiedState)
    }

    STACK = clonedStack;
    TEMP_STACK = clonedTempStack;

    goToNextOpcode({
      nextIndex,
    });
  }
 
  const abortActiveActions = (isNowTalking = false) => {
    if (isDebugging) {
      console.log('Aborting active actions', movementController.getState().position.get());
    }
    headController.stop();
    rotationController.stop();
    movementController.pause();

    if (isNowTalking) {
      animationController.stopAnimation();
    }
  }

  const updateQueue = (newItem: ReturnType<typeof getState>['queue'][number]) => {
    const {queue: currentQueue} = getState();
    const newQueue = [...currentQueue];

    const thisItemPriority = newItem.priority;
    const insertAtIndex = newQueue.findIndex(item => item.priority > thisItemPriority);
    const isTopPriority = insertAtIndex === -1;

    if (isTopPriority) {
      newQueue.push(newItem);
    } else {
      newQueue.splice(insertAtIndex, 0, newItem);
    }
    setState({
      isRunning: false,
      queue: newQueue
    });

    if (isTopPriority) {
      abortActiveActions(newItem.methodId === 'talk');
    }
  }

  const triggerMethod = async (methodId: string, isLooping = false, priority = 0) => {
    const method = script.methods.find(method => method.methodId === methodId);
    if (!method) {
      console.trace(`Method with id ${methodId} not found in script for ${script.groupId}`);
      return;
    }

    const queue = getState().queue;
    if (queue.some(item => item.methodId === methodId)) {
      return;
    }

    const uniqueId = `${script.groupId}-${methodId}--${priority}-${Date.now()}`;

    if (isDebugging) {
      console.log(`Triggering method ${methodId} for ${script.groupId}`, method.opcodes, getState().queue);
    }
    updateQueue({
      activeIndex: 0,
      opcodes: method.opcodes,
      methodId,
      isLooping,
      priority,
      uniqueId,
    });

    return new Promise<void>((resolve) => {
      document.addEventListener('scriptEnd', (event) => {
        const { detail } = event as CustomEvent;
        if (detail === uniqueId) {
          resolve();
        }
      });
    })
  }

  const triggerMethodByIndex = async (methodIndex: number, isLooping = false, priority = 0) => {
    const method = script.methods[methodIndex]
    if (!method) {
      console.trace(`Method with index ${methodIndex} not found in script for ${script.groupId}`);
      return;
    }
    console.log(`Triggering method ${method.methodId} for ${script.groupId}`,script, method.opcodes, getState().queue);
    await triggerMethod(method.methodId, isLooping, priority);
  }

  return {
    script,
    tick,
    triggerMethod,
    triggerMethodByIndex,
  }
}

export default createScriptController;