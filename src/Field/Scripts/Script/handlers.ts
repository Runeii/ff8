import { Scene, Vector3 } from "three";
import useGlobalStore from "../../../store";
import { floatingPointToNumber, getPositionOnWalkmesh, numberToFloatingPoint, vectorToFloatingPoint } from "../../../utils";
import { Opcode, OpcodeObj, Script, ScriptMethod } from "../types";
import { dummiedCommand, openMessage, remoteExecute, remoteExecuteOnPartyEntity, unusedCommand, wait } from "./utils";
import MAP_NAMES from "../../../constants/maps";
import { Group } from "three";
import { getPartyMemberModelComponent } from "./Model/modelUtils";
import { displayMessage, fadeOutMap, turnToFaceAngle, turnToFaceEntity, isKeyDown, KEY_FLAGS, animateBackground, isTouching, moveToPoint } from "./common";
import { ScriptState } from "./state";
import { createAnimationController } from "./AnimationController";

export type HandlerArgs = {
  animationController: ReturnType<typeof createAnimationController>,
  activeMethod: ScriptMethod,
  currentOpcode: OpcodeObj,
  currentOpcodeIndex: number,
  currentState: ScriptState,
  opcodes: OpcodeObj[],
  scene: Scene,
  script: Script,
  STACK: number[],
  TEMP_STACK: Record<number, number>
}

type HandlerFuncWithPromise = (args: HandlerArgs) => Promise<number | void> | (number | void);

// byte – 0,255
// word – 0,65535
// long – 0,4294967295
// signed byte – -128,127
export const MEMORY: Record<number, number> = {
  72: 9999, // gil
  84: 0, // last area visited
  256: 0, // progress
  491: 0, // touk
  641: 96,
  534: 1, // ?
  720: 0, // squall model
  721: 0, // zell model
  722: 0, // selphie model
  723: 0, // quistis model
};

export const MESSAGE_VARS: Record<number, string> = {};

export const OPCODE_HANDLERS: Partial<Record<Opcode, HandlerFuncWithPromise>> = {
  RET: () => {
    return 999999
  },
  PSHI_L: ({ currentOpcode, STACK, TEMP_STACK }) => {
    STACK.push(TEMP_STACK[currentOpcode.param] ?? 0);
  },
  POPI_L: ({ currentOpcode, STACK, TEMP_STACK }) => {
    TEMP_STACK[currentOpcode.param] = STACK.pop() as number;
  },
  PSHN_L: ({ currentOpcode, STACK }) => {
    STACK.push(currentOpcode.param);
  },
  PSHM_B: ({ currentOpcode, STACK }) => {
    window.dispatchEvent(
      new CustomEvent(
        'memory-read',
        {
          detail: MEMORY[currentOpcode.param]
        }
      ));
    STACK.push(MEMORY[currentOpcode.param] ?? 0);
  },
  PSHM_W: ({ currentOpcode, STACK }) => {
    window.dispatchEvent(
      new CustomEvent(
        'memory-read',
        {
          detail: MEMORY[currentOpcode.param]
        }
      ));
    STACK.push(MEMORY[currentOpcode.param] ?? 0);
  },
  PSHM_L: ({ currentOpcode, STACK }) => {
    window.dispatchEvent(
      new CustomEvent(
        'memory-read',
        {
          detail: MEMORY[currentOpcode.param]
        }
      ));
    STACK.push(MEMORY[currentOpcode.param] ?? 0);
  },
  PSHSM_B: ({ currentOpcode, STACK }) => {
    window.dispatchEvent(
      new CustomEvent(
        'memory-read',
        {
          detail: MEMORY[currentOpcode.param]
        }
      ));
    STACK.push(MEMORY[currentOpcode.param] ?? 0);
  },
  PSHSM_W: ({ currentOpcode, STACK }) => {
    window.dispatchEvent(
      new CustomEvent(
        'memory-read',
        {
          detail: MEMORY[currentOpcode.param]
        }
      ));
    STACK.push(MEMORY[currentOpcode.param] ?? 0);
  },
  PSHSM_L: ({ currentOpcode, STACK }) => {
    window.dispatchEvent(
      new CustomEvent(
        'memory-read',
        {
          detail: MEMORY[currentOpcode.param]
        }
      ));
    STACK.push(MEMORY[currentOpcode.param] ?? 0);
  },
  POPM_L: ({ currentOpcode, STACK }) => {
    MEMORY[currentOpcode.param] = STACK.pop() as number;
  },
  POPM_B: ({ currentOpcode, STACK }) => {
    MEMORY[currentOpcode.param] = STACK.pop() as number;
  },
  POPM_W: ({ currentOpcode, STACK }) => {
    MEMORY[currentOpcode.param] = STACK.pop() as number;
  },
  PSHAC: ({ currentOpcode, STACK }) => {
    STACK.push(currentOpcode.param);
  },
  CAL: ({ currentOpcode, opcodes, STACK }) => {
    const value2 = STACK.pop() as number;
    const value1 = STACK.pop() as number;
    if (currentOpcode.param === 0) {
      STACK.push(value1 + value2);
    } else if (currentOpcode.param === 1) {
      STACK.push(value1 - value2);
    } else if (currentOpcode.param === 2) {
      STACK.push(value1 * value2);
    } else if (currentOpcode.param === 3) {
      STACK.push(value1 / value2);
    } else if (currentOpcode.param === 4) {
      STACK.push(value1 % value2);
    } else if (currentOpcode.param === 5) {
      if (value1 !== undefined) {
        STACK.push(value1);
      }
      STACK.push(-value2);
    } else if (currentOpcode.param === 6) {
      STACK.push(value1 === value2 ? 1 : 0);
    } else if (currentOpcode.param === 7) {
      STACK.push(value1 > value2 ? 1 : 0);
    } else if (currentOpcode.param === 8) {
      STACK.push(value1 >= value2 ? 1 : 0);
    } else if (currentOpcode.param === 9) {
      STACK.push(value1 < value2 ? 1 : 0);
    } else if (currentOpcode.param === 10) {
      STACK.push(value1 <= value2 ? 1 : 0);
    } else if (currentOpcode.param === 11) {
      STACK.push(value1 !== value2 ? 1 : 0);
    } else if (currentOpcode.param === 12) {
      STACK.push(value1 & value2);
    } else if (currentOpcode.param === 13) {
      STACK.push(value1 | value2);
    } else if (currentOpcode.param === 14) {
      STACK.push(value1 ^ value2);
    } else {
      console.warn(`CAL with param ${currentOpcode.param} not implemented. Script Label ${opcodes[0].param}`);
    }
  },
  // NOTE: Jump logic differs from the original implementation
  // We precalculate the target label name and jump directly to it
  JPF: ({ currentOpcode, opcodes, STACK }) => {
    const condition = STACK.pop() as number;
    if (condition === 0) {
      return opcodes.findIndex(opcode => opcode.name === `LABEL${currentOpcode.param}`);
    }
  },
  JMP: ({ currentOpcode, opcodes }) => {
    const targetLabelIndex = opcodes.findIndex(opcode => opcode.name === `LABEL${currentOpcode.param}`);
    return targetLabelIndex;
  },
  // MODIFIED JUMP LOGIC ENDS
  SETLINE: ({ currentState, STACK }) => {
    const linePointsInMemory = STACK.splice(-6);
    currentState.linePoints = [
      vectorToFloatingPoint(linePointsInMemory.slice(0, 3)),
      vectorToFloatingPoint(linePointsInMemory.slice(3)),
    ]
  },
  UCON: () => {
    useGlobalStore.setState({ isUserControllable: true });
  },
  UCOFF: ({ currentState }) => {
    const isUserControllable = useGlobalStore.getState().isUserControllable;
    if (isUserControllable) {
      currentState.hasRemovedControl = true;
    }
    useGlobalStore.setState({ isUserControllable: false });
  },
  LINEON: ({ currentState }) => {
    currentState.isLineOn = true;
  },
  LINEOFF: ({ currentState }) => {
    currentState.isLineOn = false;
  },
  MAPJUMPO: ({ STACK }) => {
    STACK.pop() as number; // const walkmeshTriangleId = STACK.pop() as number;
    const fieldId = STACK.pop() as number;

    useGlobalStore.setState({
      pendingFieldId: MAP_NAMES[fieldId],
    });
  },
  MAPJUMP: ({ currentOpcode, STACK }) => {
    currentOpcode.param   // walkmesh ID, not necessary for us
    const mapJumpDetailsInMemory = STACK.splice(-4);

    useGlobalStore.setState({
      pendingFieldId: MAP_NAMES[mapJumpDetailsInMemory[0]],
      pendingCharacterPosition: vectorToFloatingPoint(mapJumpDetailsInMemory.slice(1, 4) as unknown as [number, number, number]),
    });
  },
  MAPJUMP3: ({ currentOpcode, STACK }) => {
    currentOpcode.param   // walkmesh ID, not necessary for us
    const mapJumpDetailsInMemory = STACK.splice(-5);

    useGlobalStore.setState({
      pendingFieldId: MAP_NAMES[mapJumpDetailsInMemory[0]],
      initialAngle: mapJumpDetailsInMemory[4],
      pendingCharacterPosition: vectorToFloatingPoint(mapJumpDetailsInMemory.slice(1, 4) as unknown as [number, number, number]),
    });
  },
  DISCJUMP: (args) => {
    OPCODE_HANDLERS?.['MAPJUMP3']?.(args);
  },
  WORLDMAPJUMP: ({ STACK }) => {
    STACK.pop() as number;
    STACK.pop() as number;
    STACK.pop() as number;
    useGlobalStore.setState({
      pendingFieldId: 'wm00',
    });
  },
  HALT: ({ currentOpcode, currentState }) => {
    currentOpcode.param // always 0
    currentState.isHalted = true;
  },
  SETPLACE: ({ STACK }) => {
    useGlobalStore.setState({ currentLocationPlaceName: STACK.pop() as number });
  },
  KEYON: async ({ currentOpcodeIndex, STACK }) => {
    const isDown = isKeyDown(STACK.pop() as keyof typeof KEY_FLAGS);

    if (isDown) {
      return currentOpcodeIndex + 2;
    }
  },
  KEYSCAN: ({ STACK, TEMP_STACK }) => {
    const key = STACK.pop() as keyof typeof KEY_FLAGS
    const isDown = isKeyDown(key);
    TEMP_STACK[0] = isDown ? 1 : 0;
  },
  KEYSCAN2: ({ STACK, TEMP_STACK }) => {
    const isDown = isKeyDown(STACK.pop() as keyof typeof KEY_FLAGS);
    TEMP_STACK[0] = isDown ? 1 : 0;
  },
  BGDRAW: ({ currentState, STACK }) => {
    const frame = STACK.pop() as number;
    currentState.isBackgroundVisible = true;
    currentState.backgroundAnimationSpring.set(frame);
  },
  BGOFF: ({ currentState }) => {
    currentState.isBackgroundVisible = false;
  },
  BGANIMESPEED: ({ currentState, STACK }) => {
    const speed = STACK.pop() as number;
    currentState.backgroundAnimationSpeed = speed;
  },
  BGANIMESYNC: async ({ currentState }) => {
    while (currentState.backgroundAnimationSpring.isAnimating) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  },
  BGCLEAR: ({ STACK }) => {
    // Maybe?
    const unknown = STACK.pop() as number;
    return;
    useGlobalStore.setState({
      backgroundLayerVisibility: {
        ...useGlobalStore.getState().backgroundLayerVisibility,
        [unknown + 1]: false
      }
    })
  },
  RBGANIME: ({ currentState, STACK }) => {
    const end = STACK.pop() as number;
    const start = STACK.pop() as number

    currentState.isBackgroundVisible = true;
    animateBackground(
      currentState.backgroundAnimationSpring,
      currentState.backgroundAnimationSpeed,
      start,
      end,
      false,
    )
  },
  RBGANIMELOOP: ({ currentState, STACK }) => {
    const end = STACK.pop() as number;
    const start = STACK.pop() as number

    currentState.isBackgroundVisible = true;

    animateBackground(
      currentState.backgroundAnimationSpring,
      currentState.backgroundAnimationSpeed,
      start,
      end,
      true,
    )
  },
  BGSHADE: ({ STACK }) => {
    STACK.splice(-7); // const lastSeven = STACK.splice(-7);
  },
  BGANIME: async ({ currentState, STACK }) => {
    const end = STACK.pop() as number;
    const start = STACK.pop() as number

    currentState.isBackgroundVisible = true;
    await animateBackground(
      currentState.backgroundAnimationSpring,
      currentState.backgroundAnimationSpeed,
      start,
      end,
      false,
    )
  },
  RND: ({ TEMP_STACK }) => {
    TEMP_STACK[0] = Math.round(Math.random() * 255);
  },
  WINSIZE: ({ currentState, STACK }) => {
    const height = STACK.pop() as number;
    const width = STACK.pop() as number;
    const y = STACK.pop() as number;
    const x = STACK.pop() as number;
    const channel = STACK.pop() as number;

    currentState.winSize[channel] = {
      x,
      y,
      width,
      height,
    }
  },
  MES: async ({ currentState, STACK }) => {
    const id = STACK.pop() as number;
    const channel = STACK.pop() as number;

    const { x, y, width, height } = currentState.winSize[channel];

    displayMessage(id, x, y, channel, width, height);
  },
  AMES: async ({ STACK }) => {
    const y = STACK.pop() as number;
    const x = STACK.pop() as number;
    const id = STACK.pop() as number;
    const channel = STACK.pop() as number;

    await displayMessage(id, x, y, channel);
  },
  AMESW: async ({ STACK }) => {
    const y = STACK.pop() as number;
    const x = STACK.pop() as number;
    const id = STACK.pop() as number;
    const channel = STACK.pop() as number;

    useGlobalStore.setState({ isUserControllable: false });
    await displayMessage(id, x, y, channel);
    useGlobalStore.setState({ isUserControllable: true });
  },
  RAMESW: async ({ STACK }) => {
    const y = STACK.pop() as number;
    const x = STACK.pop() as number;

    const id = STACK.pop() as number;
    const channel = STACK.pop() as number;

    displayMessage(id, x, y, channel);
  },
  AASK: async ({ STACK, TEMP_STACK }) => {
    const y = STACK.pop() as number;
    const x = STACK.pop() as number;

    const cancelOpt = STACK.pop() as number;
    const defaultOpt = STACK.pop() as number;
    const last = STACK.pop() as number;
    const first = STACK.pop() as number;

    const id = STACK.pop() as number;
    const channel = STACK.pop() as number;

    const { availableMessages } = useGlobalStore.getState();

    const uniqueId = `${id}--${Date.now()}`;

    useGlobalStore.setState({ isUserControllable: false });
    const result = await openMessage(uniqueId, availableMessages[id], { x, y, channel }, {
      first,
      last,
      default: defaultOpt,
      cancel: cancelOpt,
    });
    TEMP_STACK[0] = result;
    useGlobalStore.setState({ isUserControllable: true });
  },
  ASK: (args) => {
    const { STACK } = args;
    // We cannot set x,y with ask, so we spoof it here to reuse AASK
    STACK.push(5);
    STACK.push(5);

    OPCODE_HANDLERS?.AASK?.(args);
  },
  MESSYNC: ({ STACK }) => {
    STACK.pop() as number; // const channel
    useGlobalStore.setState({
      currentMessages: useGlobalStore.getState().currentMessages.slice(0, -1)
    });
    useGlobalStore.setState({ isUserControllable: true });
  },
  MESVAR: ({ STACK }) => {
    const value = STACK.pop() as number;
    const id = STACK.pop() as number;
    MESSAGE_VARS[id] = value.toString();
  },
  WINCLOSE: ({ STACK }) => {
    STACK.pop() as number; // const channel
    useGlobalStore.setState({
      currentMessages: useGlobalStore.getState().currentMessages.slice(0, -1)
    });
    useGlobalStore.setState({ isUserControllable: true });
  },
  ISTOUCH: ({ scene, script, STACK, TEMP_STACK }) => {
    const actorId = STACK.pop() as number;
    const isTouch = isTouching(script.groupId, `model--${actorId}`, scene)

    TEMP_STACK[0] = isTouch ? 1 : 0;
  },

  SCROLLMODE2: ({ STACK }) => {
    const lastFive = STACK.splice(-5);
    const layerID = lastFive[0]; // I think this is the layer
    const x1 = lastFive[1];
    const y1 = lastFive[2];
    const x2 = lastFive[3];
    const y2 = lastFive[4];

    useGlobalStore.setState({
      controlledScrolls: {
        ...useGlobalStore.getState().controlledScrolls,
        [layerID]: {
          layerID,
          x1,
          x2,
          y1,
          y2,
        }
      }
    })
  },

  WAIT: async ({ STACK }) => {
    // Runs at 30FPS
    const psxGameFrames = STACK.pop() as number;
    await wait(psxGameFrames / 30 * 1000);
  },
  // All scripts have a unique label, not sure why other IDs are required in game...
  REQ: ({ currentOpcode, STACK, script }) => {
    currentOpcode.param; // entity ID
    const label = STACK.pop() as number;
    STACK.pop(); // priority, we don't use it
    const source = `${script.groupId}--${currentOpcode.name}`
    remoteExecute(label, source)
  },
  REQSW: ({ currentOpcode, STACK, script }) => {
    currentOpcode.param; // entity ID
    const label = STACK.pop() as number;
    STACK.pop(); // priority, we don't use it
    const source = `${script.groupId}--${currentOpcode.name}`
    remoteExecute(label, source)
  },
  REQEW: async ({ currentOpcode, STACK, script }) => {
    currentOpcode.param; // entity ID
    const label = STACK.pop() as number;
    STACK.pop(); // priority, we don't use it
    const source = `${script.groupId}--${currentOpcode.name}`
    await remoteExecute(label, source)
  },
  PREQ: ({ currentOpcode, STACK, script }) => {
    const methodIndex = STACK.pop() as number;
    STACK.pop(); // priority, we don't use it
    const source = `${script.groupId}--${currentOpcode.name}`
    remoteExecuteOnPartyEntity(currentOpcode.param, methodIndex, source)
  },
  PREQSW: ({ currentOpcode, STACK, script }) => {
    const methodIndex = STACK.pop() as number;
    STACK.pop(); // priority, we don't use it
    const source = `${script.groupId}--${currentOpcode.name}`
    remoteExecuteOnPartyEntity(currentOpcode.param, methodIndex, source)
  },
  PREQEW: async ({ currentOpcode, STACK, script }) => {
    const methodIndex = STACK.pop() as number;
    STACK.pop(); // priority, we don't use it
    const source = `${script.groupId}--${currentOpcode.name}`
    await remoteExecuteOnPartyEntity(currentOpcode.param, methodIndex, source)
  },
  FADEIN: async () => {
    const { canvasOpacitySpring } = useGlobalStore.getState();
    await wait(500)
    canvasOpacitySpring.start(1);
  },
  // i believe this is the same
  FADENONE: async () => {
    const { canvasOpacitySpring } = useGlobalStore.getState();
    await wait(500)
    canvasOpacitySpring.start(1);
  },
  FADEOUT: fadeOutMap,
  FADEBLACK: fadeOutMap,
  FADESYNC: async () => {
    const { canvasOpacitySpring } = useGlobalStore.getState();
    if (canvasOpacitySpring.get() !== 1) {
      await canvasOpacitySpring.start(1)
    }
  },
  ISPARTY: ({ STACK, TEMP_STACK }) => {
    const characterID = STACK.pop() as number;
    const indexInParty = useGlobalStore.getState().party.indexOf(characterID)
    TEMP_STACK[0] = indexInParty;
  },
  SETPARTY: ({ STACK }) => {
    const character3ID = STACK.pop() as number;
    const character2ID = STACK.pop() as number;
    const character1ID = STACK.pop() as number;

    const uniqueParty = Array.from(new Set([character1ID, character2ID, character3ID])).filter(id => id !== 255);

    useGlobalStore.setState({
      party: uniqueParty
    })
  },
  ADDPARTY: ({ STACK }) => {
    const characterID = STACK.pop() as number;
    useGlobalStore.setState({
      party: [...useGlobalStore.getState().party, characterID]
    });
  },
  SUBPARTY: ({ STACK }) => {
    const characterID = STACK.pop() as number;
    useGlobalStore.setState({
      party: useGlobalStore.getState().party.filter(id => id !== characterID)
    });
  },
  GETPARTY: ({ STACK, TEMP_STACK }) => {
    const index = STACK.pop() as number;
    TEMP_STACK[0] = useGlobalStore.getState().party[index];
  },
  SETPC: ({ currentState, STACK }) => {
    const partyMemberId = STACK.pop() as number;
    currentState.partyMemberId = partyMemberId;

    if (useGlobalStore.getState().party.length < 1) {
      useGlobalStore.setState({
        party: [...useGlobalStore.getState().party, partyMemberId]
      });
    }
  },
  ADDMEMBER: ({ STACK }) => {
    const characterID = STACK.pop() as number;
    useGlobalStore.setState({
      availableCharacters: [...useGlobalStore.getState().party, characterID]
    });
  },
  SUBMEMBER: ({ STACK }) => {
    const characterID = STACK.pop() as number;
    useGlobalStore.setState({
      availableCharacters: useGlobalStore.getState().availableCharacters.filter(id => id !== characterID),
      party: useGlobalStore.getState().party.filter(id => id !== characterID),
    });
  },
  SETMODEL: ({ currentState, currentOpcode }) => {
    const modelId = currentOpcode.param;
    currentState.modelId = modelId;
  },
  BASEANIME: ({ animationController, currentOpcode, STACK }) => {
    const animationId = currentOpcode.param;
    const firstFrame = STACK.pop() as number;
    const lastFrame = STACK.pop() as number;

    animationController.setIdleAnimation(animationId, firstFrame, lastFrame);
    animationController.playIdleAnimation();
  },
  ANIME: async ({ animationController, currentOpcode }) => {
    const animationId = currentOpcode.param;

    await animationController.playAnimation({
      animationId,
    });

    animationController.playIdleAnimation();
  },
  ANIMEKEEP: async ({ animationController, currentOpcode }) => {
    const animationId = currentOpcode.param;

    await animationController.playAnimation({
      animationId,
    });
  },
  CANIME: async ({ animationController, currentOpcode, STACK }) => {
    const animationId = currentOpcode.param;
    const firstFrame = STACK.pop() as number;
    const lastFrame = STACK.pop() as number;

    await animationController.playAnimation({
      animationId,
      startFrame: firstFrame,
      endFrame: lastFrame,
    });

    animationController.playIdleAnimation();
  },
  CANIMEKEEP: async ({ animationController, currentOpcode, STACK }) => {
    const animationId = currentOpcode.param;
    const firstFrame = STACK.pop() as number;
    const lastFrame = STACK.pop() as number;

    await animationController.playAnimation({
      animationId: animationId,
      startFrame: firstFrame,
      endFrame: lastFrame,
    });
  },
  RANIME: ({ animationController, currentOpcode }) => {
    const animationId = currentOpcode.param;

    animationController.playAnimation({
      animationId,
    }).then(() => {
      animationController.playIdleAnimation();
    });
  },
  RANIMEKEEP: ({ animationController, currentOpcode }) => {
    const animationId = currentOpcode.param;

    animationController.playAnimation({
      animationId,
    });
  },
  RCANIME: ({ animationController, currentOpcode, STACK }) => {
    const animationId = currentOpcode.param;
    const firstFrame = STACK.pop() as number;
    const lastFrame = STACK.pop() as number;

    animationController.playAnimation({
      animationId,
      startFrame: firstFrame,
      endFrame: lastFrame,
    }).then(() => {
      animationController.playIdleAnimation();
    });

  },
  RCANIMEKEEP: ({ animationController, currentOpcode, STACK }) => {
    const animationId = currentOpcode.param;
    const firstFrame = STACK.pop() as number;
    const lastFrame = STACK.pop() as number;

    animationController.playAnimation({
      animationId,
      startFrame: firstFrame,
      endFrame: lastFrame,
    })
  },
  RANIMELOOP: ({ animationController, currentOpcode, }) => {
    const animationId = currentOpcode.param;

    animationController.playAnimation({
      animationId,
      isRepeating: true,
    })
  },
  RCANIMELOOP: ({ animationController, currentOpcode, STACK }) => {
    const animationId = currentOpcode.param;
    const firstFrame = STACK.pop() as number;
    const lastFrame = STACK.pop() as number;

    animationController.playAnimation({
      animationId,
      startFrame: firstFrame,
      endFrame: lastFrame,
      isRepeating: true,
    })
  },
  LADDERANIME: ({ currentOpcode, currentState, STACK }) => {
    currentOpcode.param // unknown
    currentState.ladderAnimationId = STACK.pop() as number;
    STACK.pop() as number;
  },
  ANIMESPEED: ({ animationController, STACK }) => {
    animationController.setAnimationSpeed(STACK.pop() as number)
  },
  ANIMESYNC: async ({ animationController }) => {
    return new Promise((resolve) => {
      if (animationController.getIsPlaying() === false) {
        resolve();
      }

      animationController.subscribe(state => {
        if (!state.isPlaying) {
          resolve()
        }
      })
    });
  },
  ANIMESTOP: ({ animationController }) => {
    animationController.stopAnimations();
  },
  POPANIME: () => { },
  PUSHANIME: () => { },
  UNUSE: ({ currentOpcode, currentState }) => {
    currentOpcode.param // always 0
    currentState.isUnused = true;
  },
  USE: ({ currentState }) => {
    currentState.isUnused = false;
  },
  THROUGHON: ({ currentState }) => {
    currentState.isSolid = false;
  },
  THROUGHOFF: ({ currentState }) => {
    currentState.isSolid = true;
  },
  HIDE: ({ currentState }) => {
    currentState.isVisible = false;
  },
  SHOW: ({ currentState }) => {
    currentState.isVisible = true;
  },
  SET: ({ currentOpcode, currentState, scene, STACK }) => {
    currentOpcode.param // walkmesh triangle ID, unused
    const lastTwo = STACK.splice(-2);
    const walkmesh = scene.getObjectByName('walkmesh') as Group;
    const knownPosition = lastTwo.map(numberToFloatingPoint) as [number, number];
    const vector = new Vector3(knownPosition[0], knownPosition[1], 0);
    const position = getPositionOnWalkmesh(vector, walkmesh);
    if (!position) {
      console.warn('Position not found on walkmesh', vector);
      return;
    }

    currentState.position.start([position.x, position.y, position.z], {
      immediate: true,
    });
  },
  SET3: async ({ currentOpcode, currentState, STACK }) => {
    currentOpcode.param // walkmesh triangle ID, unused
    const lastThree = STACK.splice(-3);
    const position = new Vector3(...lastThree.map(numberToFloatingPoint) as [number, number, number]);
    currentState.position.start([position.x, position.y, position.z], {
      immediate: true,
    });
  },
  TALKRADIUS: ({ currentState, STACK }) => {
    const radius = STACK.pop() as number;
    currentState.talkRadius = radius;
  },
  PUSHRADIUS: ({ currentState, STACK }) => {
    const radius = STACK.pop() as number;
    currentState.pushRadius = radius
  },
  PUSHOFF: ({ currentState }) => {
    currentState.isPushable = false;
  },
  PUSHON: ({ currentState }) => {
    currentState.isPushable = true;
  },
  TALKOFF: ({ currentState }) => {
    currentState.isTalkable = false;
  },
  TALKON: ({ currentState }) => {
    currentState.isTalkable = true;
  },
  SETGETA: ({ STACK }) => {
    // const actorId = 
    STACK.pop() as number;
  },
  GETINFO: ({ TEMP_STACK }) => {
    // We need to get this script entity's X/Y and stick it in to:
    TEMP_STACK[0] = 0; // X
    TEMP_STACK[1] = 0; // Y
  },
  MSPEED: ({ currentState, STACK }) => {
    const movementSpeed = STACK.pop() as number;
    currentState.movementSpeed = movementSpeed;
  },
  MOVEFLUSH: ({ currentState }) => {
    currentState.movementTarget = undefined;
    currentState.position.stop();
  },
  MOVECANCEL: ({ currentState, STACK }) => {
    STACK.pop() as number; // could this cancel another entity's movement?
    currentState.movementTarget = undefined;
    currentState.position.stop();
  },
  MOVESYNC: async ({ currentState }) => {
    while (currentState.position.isAnimating) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  },


  MOVE: async ({ currentState, STACK }) => {
    // const distanceToStop =
    STACK.pop() as number;
    const lastThree = STACK.splice(-3);
    const target = new Vector3(...lastThree.map(numberToFloatingPoint) as [number, number, number]);

    const { movementSpeed, position: positionSpring } = currentState;

    // if (currentState.currentAnimationId === 0 || currentState.currentAnimationId === undefined) {
    //   currentState.currentAnimationId = movementSpeed > 5000 ? 2 : 1;
    // }

    currentState.movementTarget = target;
    await moveToPoint(positionSpring, target, movementSpeed);
    currentState.movementTarget = undefined;
  },

  // MOVEA: move to actor
  MOVEA: async ({ currentState, scene, STACK }) => {
    // const distanceToStop =
    STACK.pop() as number;
    const actorId = STACK.pop() as number;

    const targetActor = scene.getObjectByName(`model--${actorId}`) as Group;
    if (!targetActor) {
      console.warn('Target actor not found', actorId);
      return;
    }

    const target = targetActor.getWorldPosition(new Vector3());

    //  if (currentState.currentAnimationId === 0 || currentState.currentAnimationId === undefined) {
    //    currentState.currentAnimationId = currentState.movementSpeed > 5000 ? 2 : 1;
    //  }

    currentState.movementTarget = target;
    await moveToPoint(currentState.position, target, currentState.movementSpeed);
    currentState.movementTarget = undefined;
  },

  // PMOVEA: move to party member
  PMOVEA: async ({ currentState, scene, STACK }) => {
    // const distanceToStop =
    STACK.pop() as number;
    const partyMemberId = STACK.pop() as number;

    const targetActor = scene.getObjectByName(`party--${partyMemberId}`) as Group;
    if (!targetActor) {
      console.warn('Target actor not found', partyMemberId);
      return;
    }
    const target = targetActor.getWorldPosition(new Vector3());

    // if (currentState.currentAnimationId === 0 || currentState.currentAnimationId === undefined) {
    //   currentState.currentAnimationId = currentState.movementSpeed > 5000 ? 2 : 1;
    // }

    currentState.movementTarget = target;
    await moveToPoint(currentState.position, target, currentState.movementSpeed);
    currentState.movementTarget = undefined;
  },


  // CMOVE: no turn, no animation
  CMOVE: async ({ currentState, STACK }) => {
    // const distanceToStop =
    STACK.pop() as number;
    const lastThree = STACK.splice(-3);
    const target = new Vector3(...lastThree.map(numberToFloatingPoint) as [number, number, number]);

    const { movementSpeed, position: positionSpring } = currentState;

    await moveToPoint(positionSpring, target, movementSpeed);
  },

  // FMOVE: turn, no animation
  FMOVE: async ({ currentState, STACK }) => {
    // const distanceToStop =
    STACK.pop() as number;
    const lastThree = STACK.splice(-3);
    const target = new Vector3(...lastThree.map(numberToFloatingPoint) as [number, number, number]);

    const { movementSpeed, position: positionSpring } = currentState;

    currentState.movementTarget = target;
    await moveToPoint(positionSpring, target, movementSpeed);
    currentState.movementTarget = undefined;
  },
  FMOVEA: async ({ currentState, STACK, scene }) => {
    // const distanceToStop =
    STACK.pop() as number;
    const partyMemberId = STACK.pop() as number;

    const targetActor = scene.getObjectByName(`party--${partyMemberId}`) as Group;

    const target = targetActor.getWorldPosition(new Vector3());
    currentState.movementTarget = target;
    await moveToPoint(currentState.position, target, currentState.movementSpeed);
    currentState.movementTarget = undefined;
  },
  FMOVEP: async ({ currentState, scene, STACK }) => {
    // const distanceToStop =
    STACK.pop() as number;
    const partyMemberId = STACK.pop() as number;

    const targetActor = scene.getObjectByName(`party--${partyMemberId}`) as Group;
    const target = targetActor.getWorldPosition(new Vector3());

    currentState.movementTarget = target;
    await moveToPoint(currentState.position, target, currentState.movementSpeed);
    currentState.movementTarget = undefined;
  },

  // R SET: do not await
  RMOVE: (args) => {
    OPCODE_HANDLERS?.MOVE?.(args);
  },
  RFMOVE: async (args) => {
    OPCODE_HANDLERS?.FMOVE?.(args);
  },
  RCMOVE: async (args) => {
    OPCODE_HANDLERS?.CMOVE?.(args);
  },
  RMOVEA: async (args) => {
    OPCODE_HANDLERS?.MOVEA?.(args);
  },
  RPMOVEA: async (args) => {
    OPCODE_HANDLERS?.PMOVEA?.(args);
  },


  JUMP3: ({ currentOpcode, STACK }) => {
    currentOpcode.param; //     currentOpcode.param; // 
    STACK.pop() as number; //     STACK.pop() as number; // 
    STACK.pop() as number; //     STACK.pop() as number; // 
    STACK.pop() as number; //     STACK.pop() as number; // 
    STACK.pop() as number; //     STACK.pop() as number; // 
  },
  JUMP: ({ currentOpcode, STACK }) => {
    currentOpcode.param; // const walkmeshTriangleId = 
    STACK.pop() as number; // const x = 
    STACK.pop() as number; // const y = 
    STACK.pop() as number; // const speed = 
  },
  PJUMPA: ({ STACK }) => {
    STACK.pop() as number; // const distance = 
    STACK.pop() as number; // const partyMemberId = 
  },

  // Turn to angle
  CTURNL: ({ currentState, STACK }) => {
    const duration = STACK.pop() as number;
    const angle = STACK.pop() as number;
    turnToFaceAngle(angle, duration, currentState.angle)
  },
  CTURNR: ({ currentState, STACK }) => {
    const duration = STACK.pop() as number;
    const angle = STACK.pop() as number;
    turnToFaceAngle(angle, duration, currentState.angle)
  },
  DIR: ({ currentState, STACK }) => {
    const angle = STACK.pop() as number;
    turnToFaceAngle(angle, 0, currentState.angle)
  },
  UNKNOWN6: ({ currentState, STACK }) => {
    const duration = STACK.pop() as number;
    const angle = STACK.pop() as number;
    turnToFaceAngle(angle, duration, currentState.angle)
  },
  UNKNOWN7: ({ currentState, STACK }) => {
    const duration = STACK.pop() as number;
    const angle = STACK.pop() as number;
    turnToFaceAngle(angle, duration, currentState.angle)
  },
  UNKNOWN8: ({ currentState, STACK }) => {
    const duration = STACK.pop() as number;
    const angle = STACK.pop() as number;
    turnToFaceAngle(angle, duration, currentState.angle)
  },
  UNKNOWN9: ({ currentState, STACK }) => {
    const duration = STACK.pop() as number;
    const angle = STACK.pop() as number;
    turnToFaceAngle(angle, duration, currentState.angle)
  },
  LTURNL: ({ currentState, STACK }) => {
    const duration = STACK.pop() as number;
    const angle = STACK.pop() as number;
    turnToFaceAngle(angle, duration, currentState.angle)
  },
  LTURNR: ({ currentState, STACK }) => {
    const duration = STACK.pop() as number;
    const angle = STACK.pop() as number;
    turnToFaceAngle(angle, duration, currentState.angle)
  },
  LTURN: ({ currentState, STACK }) => {
    const duration = STACK.pop() as number;
    const angle = STACK.pop() as number;
    turnToFaceAngle(angle, duration, currentState.angle)
  },
  PLTURN: ({ currentState, STACK }) => {
    const duration = STACK.pop() as number;
    const angle = STACK.pop() as number;
    turnToFaceAngle(angle, duration, currentState.angle)
  },

  // Turn to face entity
  CTURN: ({ currentState, scene, script, STACK }) => {
    const duration = STACK.pop() as number;
    const targetId = STACK.pop() as number;

    turnToFaceEntity(script.groupId, `model--${targetId}`, duration, scene, currentState.angle)
  },
  DIRA: ({ currentState, scene, script, STACK }) => {
    const targetActorId = STACK.pop() as number;
    turnToFaceEntity(script.groupId, `model--${targetActorId}`, 0, scene, currentState.angle)
  },

  // Turn to face party member
  // TODO: documentation is incorrect compared to usage.
  DIRP: ({ currentState, scene, script, STACK }) => {
    const partyMemberId = STACK.pop() as number;
    STACK.pop() as number; // unknown
    STACK.pop() as number; // unknown
    turnToFaceEntity(script.groupId, `party--${partyMemberId}`, 0, scene, currentState.angle)
  },
  PCTURN: ({ currentState, scene, script, STACK }) => {
    const duration = STACK.pop() as number;
    STACK.pop() as number; // unknown
    turnToFaceEntity(script.groupId, `party--0`, duration, scene, currentState.angle)
  },
  PDIRA: ({ currentState, scene, script, STACK }) => {
    const partyMemberId = STACK.pop() as number;
    turnToFaceEntity(script.groupId, `party--${partyMemberId}`, 0, scene, currentState.angle)
  },


  // These are technically just meant to be head, but whatever
  FACEDIR: ({ STACK }) => {
    STACK.splice(-4);
  },
  FACEDIRA: ({ currentState, scene, script, STACK }) => {
    const frames = STACK.pop() as number;
    const targetActorId = STACK.pop() as number;
    turnToFaceEntity(script.groupId, `model--${targetActorId}`, frames, scene, currentState.headAngle)
  },
  FACEDIRP: ({ currentState, scene, script, STACK }) => {
    const frames = STACK.pop() as number;
    const partyMemberId = STACK.pop() as number;
    turnToFaceEntity(script.groupId, `party--${partyMemberId}`, frames, scene, currentState.headAngle)
  },
  FACEDIROFF: ({ currentState, STACK }) => {
    const frames = STACK.pop() as number;
    turnToFaceAngle(0, frames, currentState.headAngle)
  },
  FACEDIRSYNC: async ({ currentState }) => {
    while (currentState.headAngle.isAnimating) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  },
  RFACEDIR: ({ STACK }) => {
    STACK.splice(-4);
  },
  RFACEDIRA: ({ currentState, scene, script, STACK }) => {
    const frames = STACK.pop() as number;
    const targetActorId = STACK.pop() as number;
    turnToFaceEntity(script.groupId, `model--${targetActorId}`, frames, scene, currentState.headAngle)
  },
  RFACEDIRP: ({ currentState, scene, script, STACK }) => {
    const frames = STACK.pop() as number;
    const partyMemberId = STACK.pop() as number;
    turnToFaceEntity(script.groupId, `party--${partyMemberId}`, frames, scene, currentState.headAngle)
  },
  RFACEDIROFF: ({ currentState, STACK }) => {
    const frames = STACK.pop() as number;
    turnToFaceAngle(0, frames, currentState.headAngle)
  },
  FACEDIRI: ({ STACK }) => {
    STACK.splice(-4);
  },
  // This sets the maximum angle allowed, likely when a model's head loops to follow another entity
  FACEDIRLIMIT: ({ STACK }) => {
    STACK.splice(-3);
  },

  ADDMAGIC: ({ STACK }) => {
    STACK.splice(-3);
  },
  POLYCOLORALL: ({ STACK }) => {
    // const lastThree = 
    STACK.splice(-3);
  },
  SHADELEVEL: ({ STACK }) => {
    // const shadeLevel = 
    STACK.pop() as number;
  },
  DOFFSET: ({ STACK }) => {
    // const lastThree = 
    STACK.splice(-3);
  },
  RUNDISABLE: () => {
    useGlobalStore.setState({ isRunEnabled: false });
  },
  RUNENABLE: () => {
    useGlobalStore.setState({ isRunEnabled: true });
  },
  DSCROLLA: ({ STACK }) => {
    const actorCode = STACK.pop() as number;
    useGlobalStore.setState({
      currentFocusActor: actorCode
    });
  },
  DSCROLLA2: ({ STACK }) => {
    STACK.pop() as number;
    const actorCode = STACK.pop() as number;
    useGlobalStore.setState({
      currentFocusActor: actorCode
    });
  },
  CSCROLLA2: ({ STACK }) => {
    STACK.pop() as number; // i reckon one of these is frames (c = controlled?)
    STACK.pop() as number; //
    const actorCode = STACK.pop() as number;
    useGlobalStore.setState({
      currentFocusActor: actorCode
    });
  },
  DOORLINEON: ({ currentState }) => {
    currentState.isDoorOn = true;
  },
  DOORLINEOFF: ({ currentState }) => {
    currentState.isDoorOn = false;
  },

  // ?
  MLIMIT: ({ STACK }) => {
    // unknown
    STACK.pop() as number;
  },
  SETROOTTRANS: ({ STACK }) => {
    // unknown
    STACK.pop() as number;
  },
  INITSOUND: () => { },

  MUSICVOLSYNC: () => { },
  //PRELOADS TRACK
  MUSICLOAD: ({ currentState, STACK }) => {
    currentState.backroundMusicId = STACK.pop() as number;
  },
  // PLAYS PRELOADED TRACK
  MUSICCHANGE: ({ currentState }) => {
    console.log('Would play', currentState.backroundMusicId)
  },
  MUSICSTOP: ({ currentState, STACK }) => {
    // 0 OR 1. No idea why. It's even sometimes called successively with 1 and 0
    STACK.pop() as number;
    currentState.backroundMusicId = undefined;
  },
  MUSICVOL: ({ currentState, STACK }) => {
    // const unknown = 
    STACK.pop() as number;
    const volume = STACK.pop() as number;
    currentState.backgroundMusicVolume = volume;
  },
  MUSICVOLTRANS: ({ currentState, STACK }) => {
    // const unknown = 
    STACK.pop() as number;
    // const duration =
    STACK.pop() as number;
    const volume = STACK.pop() as number;
    currentState.backgroundMusicVolume = volume;
  },
  // This is used once. I think it restarts the track?
  MUSICREPLAY: () => {
  },
  MUSICSKIP: ({ STACK }) => {
    // const unknown = 
    STACK.pop() as number;
  },
  // This is an assumption
  MUSICSTATUS: ({ currentState, TEMP_STACK }) => {
    const isPlaying = currentState.isPlayingBackgroundMusic ? 1 : 0
    TEMP_STACK[0] = isPlaying;
  },
  MUSICVOLFADE: ({ STACK }) => {
    STACK.pop() as number; // const startVolume =  //maybe?
    STACK.pop() as number; // const frames =  //maybe?
    STACK.pop() as number; // const endVolume = 
    STACK.pop() as number; // ???
  },

  LOADSYNC: () => { },
  FOOTSTEPON: () => { },
  SESTOP: ({ STACK }) => {
    // Likely sound effect ID
    STACK.pop() as number;
  },
  LSCROLLP: ({ STACK }) => {
    // Does this scroll to a position? Only has x/y
    STACK.splice(-2);
  },
  DSCROLLP: ({ STACK }) => {
    // Does this reset the camera?
    // const value = 
    STACK.pop() as number;
    useGlobalStore.setState({
      currentFocusActor: undefined,
    })
  },
  CSCROLL: ({ STACK }) => {
    STACK.splice(-3);
  },
  CSCROLLA: ({ STACK }) => {
    STACK.splice(-2);
  },
  CSCROLLP: ({ STACK }) => {
    STACK.splice(-2);
  },
  CSCROLL2: ({ STACK }) => {
    STACK.splice(-4);
  },
  CSCROLL3: ({ STACK }) => {
    STACK.splice(-1);
  },
  DSCROLL: ({ STACK }) => {
    STACK.splice(-2);
  },
  DSCROLL2: ({ STACK }) => {
    STACK.splice(-3);
  },
  LSCROLLA: ({ STACK }) => {
    STACK.splice(-2);
  },
  LSCROLL2: ({ STACK }) => {
    STACK.splice(-4);
  },
  LSCROLL3: ({ STACK }) => {
    STACK.splice(-6);
  },
  SCROLLSYNC: () => { },
  SCROLLSYNC2: ({ STACK }) => {
    STACK.pop() as number;
  },
  PGETINFO: ({ scene, script, STACK, TEMP_STACK }) => {
    const partyMemberId = STACK.pop() as number;
    const mesh = getPartyMemberModelComponent(scene, partyMemberId);

    if (!mesh) {
      console.warn(script, 'No mesh found for actor ID', partyMemberId);
      return;
    }

    const { x, y, z } = mesh.position;

    TEMP_STACK[0] = floatingPointToNumber(x);
    TEMP_STACK[1] = floatingPointToNumber(y);
    TEMP_STACK[2] = floatingPointToNumber(z);
  },
  IDLOCK: ({ currentOpcode }) => {
    const currentLockedTriangles = useGlobalStore.getState().lockedTriangles;
    useGlobalStore.setState({
      lockedTriangles: [...currentLockedTriangles, currentOpcode.param]
    })
  },
  IDUNLOCK: ({ currentOpcode }) => {
    const currentLockedTriangles = useGlobalStore.getState().lockedTriangles;
    useGlobalStore.setState({
      lockedTriangles: currentLockedTriangles.filter(id => id !== currentOpcode.param)
    })
  },
  MAPFADEON: () => {
    useGlobalStore.setState({ isMapFadeEnabled: true });
  },
  MAPFADEOFF: () => {
    useGlobalStore.setState({ isMapFadeEnabled: false });
  },
  SPUREADY: ({ STACK }) => {
    STACK.pop() as number;
  },
  SPUSYNC: async ({ currentState, STACK }) => {
    const frames = STACK.pop() as number;
    while (currentState.spuValue < frames) {
      await wait(100);
    }
  },
  LADDERDOWN2: async ({ currentOpcode, scene, STACK }) => {
    // Speed? Offset?
    currentOpcode.param;

    const end = vectorToFloatingPoint(STACK.splice(-3));
    const middle = vectorToFloatingPoint(STACK.splice(-3));
    const start = vectorToFloatingPoint(STACK.splice(-3));

    const playerMesh = getPartyMemberModelComponent(scene, 0);
    playerMesh.position.copy(start);
    await wait(1000);
    playerMesh.position.copy(middle);
    await wait(1000);
    playerMesh.position.copy(end);
  },
  LADDERUP2: args => OPCODE_HANDLERS?.LADDERDOWN2?.(args),
  LADDERUP: ({ currentOpcode, STACK }) => {
    currentOpcode.param;
    STACK.splice(-4);
  },
  LADDERDOWN: ({ currentOpcode, STACK }) => {
    currentOpcode.param;
    STACK.splice(-4);
  },
  MAPJUMPON: () => {
    useGlobalStore.setState({ isMapJumpEnabled: true });
  },
  MAPJUMPOFF: () => {
    useGlobalStore.setState({ isMapJumpEnabled: false });
  },
  SETTIMER: ({ currentState, STACK }) => {
    const time = STACK.pop() as number;
    currentState.countdownTime = time;
    currentState.countdownTimer = window.setInterval(() => {
      currentState.countdownTime -= 1;
      console.log(currentState.countdownTime);
      if (currentState.countdownTime <= 0) {
        window.clearTimeout(currentState.countdownTimer);
        currentState.countdownTimer = undefined;
      }
    }, 1000);
  },
  KILLTIMER: ({ currentState }) => {
    window.clearTimeout(currentState.countdownTimer);
    currentState.countdownTimer = undefined;
  },
  GETTIMER: ({ currentState, TEMP_STACK }) => {
    TEMP_STACK[0] = currentState.countdownTime
  },
  DISPTIMER: ({ STACK }) => {
    // const y = 
    STACK.pop() as number;
    // const x = 
    STACK.pop() as number;
  },
  SETCAMERA: ({ STACK }) => {
    useGlobalStore.setState({
      activeCameraId: STACK.pop() as number
    })
  },


  // FAKED
  GAMEOVER: ({ STACK }) => {
    STACK.pop() as number;
    console.error('GAME OVER WHAT DID YOU DO');
  },
  // Memory 80 is used to track frames. This is used to fake a movie
  MOVIE: () => {
    MEMORY['80'] = 0;
    const interval = setInterval(() => {
      MEMORY['80'] += 100;
      if (MEMORY['80'] > 3000) {
        clearInterval(interval);
      }
    }, 1000 / 30);
  },
  ADDGIL: ({ STACK }) => {
    const gil = STACK.pop() as number;
    MEMORY[72] += gil;
  },
  HASITEM: ({ STACK }) => {
    STACK.pop() as number;
    STACK.push(1);
  },


  // SOUND

  ALLSEPOSTRANS: ({ STACK }) => {
    STACK.splice(-3);
  },
  ALLSEVOL: ({ STACK }) => {
    STACK.pop() as number;
  },
  ALLSEVOLTRANS: ({ STACK }) => {
    STACK.splice(-2);
  },
  FOOTSTEP: ({ currentOpcode, STACK }) => {
    currentOpcode.param; // unknown
    STACK.pop() as number;
  },
  FOOTSTEPOFF: () => { },
  FOOTSTEPCUT: () => { },
  FOOTSTEPOFFALL: () => { },


  MENUSHOP: ({ STACK }) => {
    // Likely shop ID
    STACK.pop() as number;
  },
  DRAWPOINT: ({ STACK }) => {
    // drawpoint ID
    STACK.pop() as number;
  },
  EFFECTPLAY: ({ STACK }) => {
    STACK.pop() as number; //const volume = 
    STACK.pop() as number; //const pan = 
    STACK.pop() as number; //const channel = 
    STACK.pop() as number; //const sfxId = 
  },
  EFFECTPLAY2: ({ currentOpcode, STACK }) => {
    currentOpcode.param; // const sfxId = 
    STACK.pop() as number; // const channel = 
    STACK.pop() as number; // const volume = 
    STACK.pop() as number; // const pan = 
  },
  EFFECTLOAD: ({ STACK }) => {
    // const loopingBackgroundEffectId = 
    STACK.pop() as number; // note: check docs, apparently not normal
  },
  SAVEENABLE: ({ STACK }) => {
    // const isEnabled =
    STACK.pop() as number;
  },
  INITTRACE: () => { },
  SHAKE: ({ STACK }) => {
    //const lastFour =
    STACK.splice(-4);
  },
  SHAKEOFF: () => { },
  MACCEL: ({ STACK }) => {
    STACK.pop() as number;
    STACK.pop() as number;
    STACK.pop() as number;
    STACK.pop() as number;
    STACK.pop() as number;
  },
  MOVIEREADY: ({ STACK }) => {
    STACK.pop() as number;
    STACK.pop() as number;
  },
  SEVOL: ({ STACK }) => {
    STACK.splice(-2);
  },
  SEVOLTRANS: ({ STACK }) => {
    STACK.splice(-3);
  },
  SEPOS: ({ STACK }) => {
    STACK.splice(-2);
  },
  SEPOSTRANS: ({ STACK }) => {
    STACK.splice(-3);
  },
  SETBATTLEMUSIC: ({ STACK }) => {
    STACK.pop() as number;
  },
  PARTICLEON: ({ STACK }) => {
    STACK.pop() as number;
  },
  SHADESET: ({ STACK }) => {
    STACK.pop() as number;
  },
  BGSHADESTOP: () => { },
  RBGSHADELOOP: ({ STACK }) => {
    STACK.splice(-10);
  },
  CARDGAME: ({ STACK }) => {
    STACK.splice(-7);
  },
  SETWITCH: ({ STACK }) => {
    STACK.pop() as number;
  },
  PREMAPJUMP2: ({ STACK }) => {
    STACK.pop() as number;
  },
  // Sets message box style for channel (we don't use channels atm)
  MESMODE: ({ STACK }) => {
    STACK.splice(-3);
  },
  BATTLE: ({ STACK }) => {
    STACK.splice(-2);
  },
  BATTLEMODE: ({ STACK }) => {
    STACK.pop() as number;
  },
  JUNCTION: ({ STACK }) => {
    STACK.pop() as number;
  },
  PHSENABLE: ({ STACK }) => {
    STACK.pop() as number;
  },
  LSCROLL: ({ STACK }) => {
    STACK.splice(-3);
  },
  // Sets draw point ID
  UNKNOWN16: ({ STACK }) => {
    STACK.pop() as number;
  },
  ADDITEM: ({ STACK }) => {
    STACK.splice(-2);
  },
  SETVIBRATE: ({ STACK }) => {
    STACK.splice(-2);
  },
  PHSPOWER: ({ STACK }) => {
    STACK.pop() as number;
  },
  GETCARD: ({ STACK }) => {
    STACK.pop() as number;
  },
  WHOAMI: ({ STACK }) => {
    STACK.pop() as number;
  },
  WHERECARD: ({ STACK }) => {
    STACK.pop() as number;
  },
  MENUTIPS: ({ STACK }) => {
    STACK.pop() as number;
  },
  SETDCAMERA: ({ STACK }) => {
    STACK.pop() as number;
  },
  SETMESSPEED: ({ STACK }) => {
    STACK.pop() as number;
    STACK.pop() as number;
  },
  CHOICEMUSIC: ({ STACK }) => {
    STACK.pop() as number;
    STACK.pop() as number;
  },
  CROSSMUSIC: ({ STACK }) => {
    STACK.pop() as number;
    STACK.pop() as number;
  },
  DUALMUSIC: ({ STACK }) => {
    STACK.pop() as number;
  },
  CHANGEPARTY: ({ STACK }) => {
    STACK.pop() as number;
    STACK.pop() as number;
  },
  ADDPASTGIL: ({ STACK }) => {
    STACK.pop() as number;
  },
  ANGELODISABLE: ({ STACK }) => {
    STACK.pop() as number;
  },
  PARTICLESET: ({ STACK }) => {
    STACK.pop() as number; 3
  },
  SHADEFORM: ({ STACK }) => {
    STACK.splice(-8)
  },

  // Completely unknown. Mainly used in cmwood maps?
  BROKEN: ({ STACK }) => {
    STACK.splice(-8);
  },

  // Set: unused, but manipulate stack. here for completeness
  ALLSEPOS: ({ STACK }) => {
    STACK.splice(-1);
  },
  MESW: ({ STACK }) => {
    STACK.splice(-2);
  },
  UNKNOWN1: ({ STACK }) => {
    STACK.pop() as number;
  },
  UNKNOWN17: ({ STACK }) => {
    STACK.pop() as number;
  },
  UNKNOWN18: ({ STACK }) => {
    STACK.pop() as number;
  },
  HOWMANYCARD: ({ STACK }) => {
    STACK.pop() as number;
  },
  DISC: ({ STACK }) => {
    STACK.pop() as number;
  },
  UNKNOWN13: ({ STACK }) => {
    STACK.pop() as number;
  },
  MENUNAME: ({ STACK }) => {
    STACK.pop() as number;
  },
  LASTIN: ({ STACK }) => {
    STACK.pop() as number;
  },
  COPYINFO: ({ STACK }) => {
    STACK.pop() as number;
  },
  LASTOUT: dummiedCommand,
  SEALEDOFF: ({ STACK }) => {
    STACK.pop() as number;
  },
  KILLBAR: ({ STACK }) => {
    STACK.pop() as number;
  },
  SETBAR: ({ STACK }) => {
    STACK.splice(-2);
  },
  DISPBAR: ({ STACK }) => {
    STACK.splice(-7);
  },
  SETHP: ({ STACK }) => {
    // I assume actorId + HP
    STACK.splice(-2);
  },
  ACTORMODE: ({ STACK }) => {
    STACK.pop() as number;
  },
  RESETGF: ({ STACK }) => {
    STACK.pop() as number;
  },
  HOLD: ({ STACK }) => {
    STACK.splice(-3);
  },
  AXIS: ({ STACK }) => {
    STACK.splice(-2);
  },
  PREMAPJUMP: ({ STACK }) => {
    STACK.splice(-4);
  },
  SETDRAWPOINT: ({ STACK }) => {
    STACK.pop() as number;
  },
  PARTICLEOFF: ({ STACK }) => {
    STACK.pop() as number;
  },
  UNKNOWN11: ({ STACK }) => {
    STACK.splice(-2);
  },
  UNKNOWN14: ({ STACK }) => {
    STACK.pop() as number;
  },
  UNKNOWN15: ({ STACK }) => {
    STACK.pop() as number;
  },
  ADDSEEDLEVEL: ({ STACK }) => {
    STACK.pop() as number;
  },
  SETCARD: ({ STACK }) => {
    STACK.pop() as number;
    STACK.pop() as number;
  },
  POLYCOLOR: ({ STACK }) => {
    STACK.splice(-3);
  },
  SCROLLRATIO2: ({ STACK }) => {
    STACK.splice(-3);
  },
  SETDRESS: ({ STACK }) => {
    STACK.pop() as number;
    STACK.pop() as number;
  },
  // Used once in the balamb basement. I think it might clear a ladder key?
  KEY: ({ STACK }) => {
    STACK.pop() as number;
  },
  DCOLADD: ({ STACK }) => {
    STACK.splice(-3);
  },
  DCOLSUB: ({ STACK }) => {
    STACK.splice(-3);
  },
  FCOLADD: ({ STACK }) => {
    STACK.splice(-7);
  },
  FCOLSUB: ({ STACK }) => {
    STACK.splice(-7);
  },
  TCOLADD: ({ STACK }) => {
    STACK.splice(-4);
  },
  TCOLSUB: ({ STACK }) => {
    STACK.splice(-4);
  },
  COLSYNC: () => { },
  COFFSET: ({ STACK }) => {
    STACK.splice(-4);
  },
  COFFSETS: ({ STACK }) => {
    STACK.splice(-7);
  },
  LOFFSET: ({ STACK }) => {
    STACK.splice(-4);
  },
  LOFFSETS: ({ STACK }) => {
    STACK.splice(-7);
  },
  MENUTUTO: () => { },
  TUTO: ({ STACK }) => {
    STACK.pop() as number;
  },
  OFFSETSYNC: () => { },
  UNKNOWN2: ({ STACK }) => {
    STACK.pop() as number;
  },
  UNKNOWN3: ({ STACK }) => {
    STACK.pop() as number;
  },
  UNKNOWN4: ({ STACK }) => {
    STACK.pop() as number;
  },


  UNKNOWN12: dummiedCommand,
  CLOSEEYES: dummiedCommand,
  DYING: dummiedCommand,
  UNKNOWN10: dummiedCommand,
  BATTLEON: dummiedCommand,
  BATTLEOFF: dummiedCommand,
  BATTLERESULT: dummiedCommand,
  BATTLECUT: dummiedCommand,
  MENUENABLE: dummiedCommand,
  MENUDISABLE: dummiedCommand,
  MOVIESYNC: dummiedCommand,
  REST: dummiedCommand,
  JOIN: dummiedCommand,
  FOLLOWOFF: dummiedCommand,
  FOLLOWON: dummiedCommand,
  REFRESHPARTY: dummiedCommand,
  FOOTSTEPCOPY: dummiedCommand,
  MOVIECUT: dummiedCommand,
  MENUSAVE: dummiedCommand,
  SETODIN: dummiedCommand,
  MENUPHS: dummiedCommand,
  MENUNORMAL: dummiedCommand,
  FACEDIRINIT: dummiedCommand,
  SARALYDISPON: dummiedCommand,
  SARALYDISPOFF: dummiedCommand,
  SARALYON: dummiedCommand,
  SARALYOFF: dummiedCommand,
  CLEAR: dummiedCommand,
  SWAP: dummiedCommand,
  BGSHADEOFF: dummiedCommand,

  NOP: unusedCommand,
  GJMP: unusedCommand,
  DEBUG: unusedCommand,
  ISMEMBER: unusedCommand,
  MESFORCUS: unusedCommand,
  SHADETIMER: unusedCommand,
  STOPVIBRATE: unusedCommand,
  ENDING: unusedCommand,
  BGANIMEFLAG: unusedCommand,
  LSCROLLA2: unusedCommand,
  DSCROLLP2: unusedCommand,
  LSCROLLP2: unusedCommand,
  CSCROLLP2: unusedCommand,
  GETDRESS: unusedCommand,
  RFACEDIRI: unusedCommand,
  PCOPYINFO: unusedCommand,
  AXISSYNC: unusedCommand,
  DSCROLL3: unusedCommand,
  PMOVECANCEL: unusedCommand,
  GETHP: unusedCommand,
  KEYON2: unusedCommand,
  KEYSIGHNCHANGE: unusedCommand,
  OPENEYES: unusedCommand,
  BLINKEYES: unusedCommand,
  SETPARTY2: unusedCommand,

  LBL: unusedCommand,
}
