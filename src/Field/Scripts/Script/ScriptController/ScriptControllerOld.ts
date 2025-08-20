  import { create } from "zustand";
  import { OpcodeObj, Script } from "../../types";
  import { OPCODE_HANDLERS } from "../handlers";
  import { Scene } from "three";
  import createMovementController from "../MovementController/MovementController";
  import { createAnimationController } from "../AnimationController/AnimationController";
  import createRotationController from "../RotationController/RotationController";
  import createScriptState from "../state";
  import createSFXController from "../SFXController/SFXController";
import { sendToDebugger } from "../../../../Debugger/debugUtils";

  type QueueItem = {
    activeIndex: number;
    opcodes: OpcodeObj[];
    methodId: string;
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
      isAwaitingAnOpcode: false,
      isRunning: false,
      queue: [] as QueueItem[],
      script,
    }));

    const goToNextOpcode = ({
      activeQueueItem,
      isHalting = false,
      nextIndex,
    }: {
      activeQueueItem?: QueueItem,
      nextIndex?: number | void;
      isHalting?: boolean;
    }) => {
      if (!activeQueueItem) {
        setState({
          isRunning: false,
        });
        return;
      }
      try {
      const { queue } = getState();

      const newQueue = [...queue];
      const { isLooping, opcodes, uniqueId } = newQueue.at(-1)!;

      let currentQueueItem: QueueItem | undefined = activeQueueItem;
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
        currentQueueItem = undefined;
      }

      const updatedQueue = newQueue.map(item => item.uniqueId === activeQueueItem?.uniqueId ? currentQueueItem : item).filter(item => item) as QueueItem[];

      // Fire the scriptEnd event if the queue has changed
      // This allows us to await the script end in the triggerMethod function
      if (queue.length !== updatedQueue.length) {
        const event = new CustomEvent('scriptEnd', {
          detail: uniqueId
        });
        document.dispatchEvent(event);
      }
      
      if (isDebugging) {
        console.log(`Going to next opcode for script ${script.groupId}. Current queue item:`, currentQueueItem, 'Next index:', nextIndex, isHalting);
      }
      setState({
        isRunning: false,
        queue: updatedQueue,
      });
    } catch(error) {
      console.error('Error in goToNextOpcode:', script, getState(), structuredClone(getState().queue));
      throw error;
    }
  }

    const handleSpecialCaseOpcodes = (currentOpcode: OpcodeObj, activeQueueItem: QueueItem, activeIndex: number) => {
      if (currentOpcode.name.startsWith('LABEL')) {
        goToNextOpcode({
          activeQueueItem,
          nextIndex: activeIndex + 1
        });
        return true;
      }

      if (currentOpcode.name === 'HALT') {
        goToNextOpcode({
          activeQueueItem,
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
      
      const topQueueItem = queue.at(-1)!;
      const { activeIndex, methodId, opcodes, uniqueId } = topQueueItem;
      const currentOpcode = opcodes[activeIndex];

      const shouldReturnEarly = handleSpecialCaseOpcodes(currentOpcode, topQueueItem, activeIndex);
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

      sendToDebugger('opcode', JSON.stringify({
        id: script.groupId,
        methodId,
        index: activeIndex,
        opcode: currentOpcode,
      }))

      const promise = opcodeHandler({
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
      
      const nextIndex = await promise;

      // If there is a new priority item in the queue, we need to abort the current run and discard changes
      // Springs and controllers were already stopped when the new item was added to the queue
      const currentlyTopOfQueue = getState().queue.at(-1);
      if (!currentlyTopOfQueue || currentlyTopOfQueue.uniqueId !== uniqueId) {
        goToNextOpcode({
          activeQueueItem: currentlyTopOfQueue,
          nextIndex,
        });
        return;
      }

      // Only update the store if state has changed
      if (JSON.stringify(modifiedState) !== '{}') {
        useScriptStateStore.setState(modifiedState)
      }

      STACK = clonedStack;
      TEMP_STACK = clonedTempStack;

      goToNextOpcode({
        activeQueueItem: currentlyTopOfQueue,
        nextIndex,
      });
    }
  
    const abortActiveActions = (currentQueueItem: QueueItem) => {
      headController.stop();
      rotationController.stop();
      movementController.pause();
      animationController.stopAnimation();
    }

    const updateQueue = (newItem: ReturnType<typeof getState>['queue'][number]) => {
      const {queue: currentQueue} = getState();
      const currentlyActiveQueueItem = currentQueue.at(-1);
      const newQueue = [...currentQueue];

      const thisItemPriority = newItem.priority;
      const insertAtIndex = newQueue.findIndex(item => item.priority > thisItemPriority);
      const isTopPriority = insertAtIndex === -1;

      const isCurrentItemInterruptable =
        currentQueue.length > 0 && (!currentlyActiveQueueItem || currentlyActiveQueueItem.isLooping || currentlyActiveQueueItem.priority < thisItemPriority);

      if (isTopPriority && isCurrentItemInterruptable) {
        newQueue.push(newItem);
      } else if (isTopPriority && !isCurrentItemInterruptable) {
        newQueue.splice(newQueue.length - 1, 0, newItem);
      } else {
        newQueue.splice(insertAtIndex, 0, newItem);
      }

      setState({
        isRunning: false,
        queue: newQueue
      });

      if (isTopPriority && currentlyActiveQueueItem) {
        abortActiveActions(currentlyActiveQueueItem);
      }
    }

    const triggerMethod = async (methodId: string, priority = 0) => {
      const method = script.methods.find(method => method.methodId === methodId);
      if (!method) {
        console.trace(`Method with id ${methodId} not found in script for ${script.groupId}`);
        return;
      }

      const isLooping = method.methodId === "default"

      // Filter out empty methods
      const isValidActionableMethod = method.opcodes.filter(opcode => !opcode.name.startsWith('LABEL') && opcode.name !== 'LBL' && opcode.name !== 'RET' && opcode.name !== 'HALT').length > 0;

      if (!isValidActionableMethod) {
        return;
      }

      const uniqueId = `${script.groupId}-${methodId}--${priority}-${Date.now()}`;

      if (isDebugging) {
        console.log(`Adding method ${methodId} to queue with unique ID ${uniqueId}`);
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
        const handler = ({ detail }: { detail: string}) => {
          if (detail === uniqueId) {
            document.removeEventListener('scriptEnd', handler);
            resolve();
          }
        };
        document.addEventListener('scriptEnd', handler);
      })
    }

    const triggerMethodByIndex = async (methodIndex: number, priority = 0) => {
      const method = script.methods[methodIndex]
      if (!method) {
        console.trace(`Method with index ${methodIndex} not found in script for ${script.groupId}`);
        return;
      }
      await triggerMethod(method.methodId, priority);
    }

    return {
      script,
      tick,
      triggerMethod,
      triggerMethodByIndex,
    }
  }

  export default createScriptController;