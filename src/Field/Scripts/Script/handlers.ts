import { Scene, Vector3 } from "three";
import useGlobalStore from "../../../store";
import { floatingPointToNumber, getPositionOnWalkmesh, numberToFloatingPoint, vectorToFloatingPoint } from "../../../utils";
import { Opcode, OpcodeObj, Script, ScriptMethod, ScriptState } from "../types";
import { dummiedCommand, openMessage, remoteExecute, unusedCommand, wait } from "./utils";
import MAP_NAMES from "../../../constants/maps";
import { MutableRefObject } from "react";
import { Group } from "three";
import { animateFrames } from "./Background/backgroundUtils";
import { getPartyMemberModelComponent, playAnimation } from "./Model/modelUtils";
import { fadeOutMap, turnToFacePlayer, turnWithDuration } from "./common";

export type HandlerArgs = {
  activeMethod: ScriptMethod,
  currentOpcode: OpcodeObj,
  opcodes: OpcodeObj[],
  currentStateRef: MutableRefObject<ScriptState>,
  scene: Scene,
  script: Script,
  STACK: number[],
  TEMP_STACK: Record<number, number>
}
type HandlerFuncWithPromise = (args: HandlerArgs) => Promise<number | void> | (number | void);

export const MEMORY: Record<number, number> = {
  72: 9999, // gil
  256: 8000,
  534: 1,
  84: 196
};

let testState = {}

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
    STACK.push(MEMORY[currentOpcode.param] ?? 0);
  },
  PSHM_W: ({ currentOpcode, STACK }) => {
    STACK.push(MEMORY[currentOpcode.param] ?? 0);
  },
  PSHM_L: ({ currentOpcode, STACK }) => {
    STACK.push(MEMORY[currentOpcode.param] ?? 0);
  },
  PSHSM_B: ({ currentOpcode, STACK }) => {
    STACK.push(MEMORY[currentOpcode.param] ?? 0);
  },
  PSHSM_W: ({ currentOpcode, STACK }) => {
    STACK.push(MEMORY[currentOpcode.param] ?? 0);
  },
  PSHSM_L: ({ currentOpcode, STACK }) => {
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
  SETLINE: ({ currentStateRef, STACK }) => {
    const linePointsInMemory = STACK.splice(-6);
    currentStateRef.current.linePoints = [
      vectorToFloatingPoint(linePointsInMemory.slice(0, 3)),
      vectorToFloatingPoint(linePointsInMemory.slice(3)),
    ]
  },
  UCON: () => {
    useGlobalStore.setState({ isUserControllable: true });
  },
  UCOFF: ({ currentStateRef }) => {
    const isUserControllable = useGlobalStore.getState().isUserControllable;
    if (isUserControllable) {
      currentStateRef.current.hasRemovedControl = true;
    }
    useGlobalStore.setState({ isUserControllable: false });
  },
  LINEON: ({ currentStateRef }) => {
    currentStateRef.current.isLineOn = true;
  },
  LINEOFF: ({ currentStateRef }) => {
    currentStateRef.current.isLineOn = false;
  },
  MAPJUMPO: ({ STACK }) => {
    STACK.pop() as number; // const walkmeshTriangleId = STACK.pop() as number;
    const fieldId = STACK.pop() as number;

    useGlobalStore.setState({
      fieldId: MAP_NAMES[fieldId],
      isTransitioningMap: true,
    });
  },
  MAPJUMP: ({ STACK }) => {
    const mapJumpDetailsInMemory = STACK.splice(-4);

    useGlobalStore.setState({
      fieldId: MAP_NAMES[mapJumpDetailsInMemory[0]],
      isTransitioningMap: true,
      pendingCharacterPosition: vectorToFloatingPoint(mapJumpDetailsInMemory.slice(1, 4) as unknown as [number, number, number]),
    });
  },
  MAPJUMP3: ({ STACK }) => {
    const mapJumpDetailsInMemory = STACK.splice(-5);

    useGlobalStore.setState({
      fieldId: MAP_NAMES[mapJumpDetailsInMemory[0]],
      initialAngle: mapJumpDetailsInMemory[4],
      isTransitioningMap: true,
      pendingCharacterPosition: vectorToFloatingPoint(mapJumpDetailsInMemory.slice(1, 4) as unknown as [number, number, number]),
    });
  },
  DISCJUMP: (...args) => {
    OPCODE_HANDLERS?.['MAPJUMP3']?.(...args);
  },
  WORLDMAPJUMP: ({ STACK }) => {
    STACK.pop() as number;
    STACK.pop() as number;
    STACK.pop() as number;
    useGlobalStore.setState({
      fieldId: 'WORLD_MAP',
    });
  },
  HALT: ({ currentStateRef }) => {
    currentStateRef.current.isHalted = true;
  },
  SETPLACE: ({ STACK }) => {
    useGlobalStore.setState({ currentLocationPlaceName: STACK.pop() as number });
  },
  // TODO: This needs to handle loops better
  KEYON: async ({ STACK, TEMP_STACK }) => {
    const key = STACK.pop() as number;

    const keydown = (event: KeyboardEvent) => {
      if (event.keyCode === key) {
        TEMP_STACK[0] = 1;
      }
    }

    const keyup = () => {
      TEMP_STACK[0] = 0;
    }

    window.addEventListener('keydown', keydown, { once: true });
    window.addEventListener('keyup', keyup, { once: true });
    window.setTimeout(() => {
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
    }, 1000);
    TEMP_STACK[7] = 200;
  },
  BGDRAW: ({ currentStateRef, STACK }) => {
    // I don't think this is actually used
    STACK.pop() as number;
    currentStateRef.current.isBackgroundVisible = true;
  },
  BGOFF: ({ currentStateRef }) => {
    currentStateRef.current.isBackgroundVisible = false;
  },
  BGANIMESPEED: ({ currentStateRef, STACK }) => {
    const speed = STACK.pop() as number;
    currentStateRef.current.backgroundAnimationSpeed = speed;
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
  RBGANIMELOOP: async ({ currentStateRef, script, STACK }) => {
    const end = STACK.pop() as number;
    const start = STACK.pop() as number

    currentStateRef.current.isBackgroundVisible = true;
    animateFrames(
      script.backgroundParamId,
      start,
      end,
      currentStateRef.current.backgroundAnimationSpeed,
      true
    );
  },
  BGSHADE: ({ STACK }) => {
    STACK.splice(-7); // const lastSeven = STACK.splice(-7);
  },
  BGANIME: async ({ currentStateRef, STACK, script }) => {
    const end = STACK.pop() as number;
    const start = STACK.pop() as number

    currentStateRef.current.isBackgroundVisible = true;
    await animateFrames(
      script.backgroundParamId,
      start,
      end,
      currentStateRef.current.backgroundAnimationSpeed,
      false
    );
    console.log('BGANIME', start, end)
  },
  RND: ({ TEMP_STACK }) => {
    TEMP_STACK[0] = Math.round(Math.random() * 255);
  },
  AMES: async ({ STACK }) => {
    const y = STACK.pop() as number;
    const x = STACK.pop() as number;
    const id = STACK.pop() as number;
    STACK.pop() as number; // const channel = STACK.pop() as number;

    const { availableMessages } = useGlobalStore.getState();

    const uniqueId = `${id}--${Date.now()}`;
    await openMessage(uniqueId, availableMessages[id], x, y);
    useGlobalStore.setState({ isUserControllable: false });
  },
  AMESW: async ({ STACK }) => {
    const y = STACK.pop() as number;
    const x = STACK.pop() as number;

    const id = STACK.pop() as number;
    STACK.pop() as number; // const channel = STACK.pop() as number;

    const { availableMessages } = useGlobalStore.getState();
    useGlobalStore.setState({ isUserControllable: false });
    const uniqueId = `${id}--${Date.now()}`;
    await openMessage(uniqueId, availableMessages[id], x, y);
    useGlobalStore.setState({ isUserControllable: true });
  },
  RAMESW: async ({ STACK }) => {
    const y = STACK.pop() as number;
    const x = STACK.pop() as number;

    const id = STACK.pop() as number;
    STACK.pop() as number; // const channel = STACK.pop() as number;

    const { availableMessages } = useGlobalStore.getState();

    const uniqueId = `${id}--${Date.now()}`;
    openMessage(uniqueId, availableMessages[id], x, y);
  },
  AASK: async ({ STACK, TEMP_STACK }) => {
    const y = STACK.pop() as number;
    const x = STACK.pop() as number;

    const cancelOpt = STACK.pop() as number;
    const defaultOpt = STACK.pop() as number;
    const last = STACK.pop() as number;
    const first = STACK.pop() as number;

    const id = STACK.pop() as number;
    STACK.pop() as number; // const channel = STACK.pop() as number;

    const { availableMessages } = useGlobalStore.getState();

    const uniqueId = `${id}--${Date.now()}`;

    useGlobalStore.setState({ isUserControllable: false });
    const result = await openMessage(uniqueId, availableMessages[id], x, y, {
      first,
      last,
      default: defaultOpt,
      cancel: cancelOpt,
    });
    TEMP_STACK[0] = result;
    useGlobalStore.setState({ isUserControllable: true });
  },
  ASK: (...args) => {
    const { STACK } = args[0];
    // We cannot set x,y with ask, so we spoof it here to reuse AASK
    STACK.push(5);
    STACK.push(5);

    OPCODE_HANDLERS?.AASK?.(...args);
  },
  MESSYNC: ({ STACK }) => {
    const channel = STACK.pop() as number;
    useGlobalStore.setState({
      currentMessages: useGlobalStore.getState().currentMessages.slice(0, -1)
    });
    useGlobalStore.setState({ isUserControllable: true });
  },
  WINCLOSE: () => {
    useGlobalStore.setState({
      currentMessages: useGlobalStore.getState().currentMessages.slice(0, -1)
    });
    useGlobalStore.setState({ isUserControllable: true });
  },
  ISTOUCH: ({ STACK, TEMP_STACK }) => {
    //const actorId = 
    STACK.pop() as number;
    TEMP_STACK[0] = 0; // TODO: 1 if actor is in touching distance of this entity
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
  REQ: ({ STACK }) => {
    const label = STACK.pop() as number;
    STACK.pop(); // priority, we don't use it
    remoteExecute(label)
  },
  REQSW: ({ STACK }) => {
    const label = STACK.pop() as number;
    STACK.pop(); // priority, we don't use it
    remoteExecute(label)
  },
  REQEW: async ({ STACK }) => {
    const label = STACK.pop() as number;
    STACK.pop(); // priority, we don't use it
    await remoteExecute(label)
  },
  PREQ: ({ currentOpcode, STACK }) => {
    const label = STACK.pop() as number;
    STACK.pop(); // priority, we don't use it
    remoteExecute(label, currentOpcode.param)
  },
  PREQSW: ({ currentOpcode, STACK }) => {
    const label = STACK.pop() as number;
    STACK.pop(); // priority, we don't use it
    remoteExecute(label, currentOpcode.param)
  },
  PREQEW: async ({ currentOpcode, STACK }) => {
    const label = STACK.pop() as number;
    STACK.pop(); // priority, we don't use it
    await remoteExecute(label, currentOpcode.param)
  },
  FADEIN: async () => {
    const fadeSpring = useGlobalStore.getState().fadeSpring;
    await wait(500)
    fadeSpring.opacity.start(1);
  },
  // i believe this is the same
  FADENONE: async () => {
    const fadeSpring = useGlobalStore.getState().fadeSpring;
    await wait(500)
    fadeSpring.opacity.start(1);
  },
  FADEOUT: fadeOutMap,
  FADEBLACK: fadeOutMap,
  FADESYNC: async () => {
    const fadeSpring = useGlobalStore.getState().fadeSpring;
    if (fadeSpring.opacity.get() !== 1) {
      await fadeSpring.opacity.start(1)
    }
  },
  ISPARTY: ({ STACK, TEMP_STACK }) => {
    const characterID = STACK.pop() as number;
    const indexInParty = useGlobalStore.getState().party.indexOf(characterID)
    TEMP_STACK[0] = indexInParty;
  },
  SETPARTY: ({ STACK }) => {
    const character1ID = STACK.pop() as number;
    const character2ID = STACK.pop() as number;
    const character3ID = STACK.pop() as number;

    useGlobalStore.setState({
      party: [character1ID, character2ID, character3ID]
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
  SETPC: ({ currentStateRef, STACK }) => {
    const partyMemberId = STACK.pop() as number;
    currentStateRef.current.partyMemberId = partyMemberId;
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
  SETMODEL: ({ currentStateRef, currentOpcode }) => {
    const modelId = currentOpcode.param;
    currentStateRef.current.modelId = modelId;
  },
  BASEANIME: ({ currentStateRef, currentOpcode, scene, script, STACK }) => {
    const animationId = currentOpcode.param;
    const firstFrame = STACK.pop() as number;
    const lastFrame = STACK.pop() as number;

    currentStateRef.current.idleAnimationId = animationId;

    playAnimation(
      animationId,
      currentStateRef.current,
      scene,
      script,
      false,
      true,
      [firstFrame, lastFrame]
    )
  },
  ANIME: async ({ currentStateRef, currentOpcode, scene, script }) => {
    const animationId = currentOpcode.param;

    await playAnimation(
      animationId,
      currentStateRef.current,
      scene,
      script,
      false,
      false
    )
  },
  ANIMEKEEP: async ({ currentStateRef, currentOpcode, scene, script }) => {
    const animationId = currentOpcode.param;

    await playAnimation(
      animationId,
      currentStateRef.current,
      scene,
      script,
      true,
      false
    )
  },
  CANIME: async ({ currentStateRef, currentOpcode, scene, script, STACK }) => {
    const animationId = currentOpcode.param;
    const firstFrame = STACK.pop() as number;
    const lastFrame = STACK.pop() as number;

    await playAnimation(
      animationId,
      currentStateRef.current,
      scene,
      script,
      false,
      false,
      [firstFrame, lastFrame]
    )
  },
  CANIMEKEEP: async ({ currentStateRef, currentOpcode, scene, script, STACK }) => {
    const animationId = currentOpcode.param;
    const firstFrame = STACK.pop() as number;
    const lastFrame = STACK.pop() as number;

    await playAnimation(
      animationId,
      currentStateRef.current,
      scene,
      script,
      true,
      false,
      [firstFrame, lastFrame]
    )
  },
  RANIME: ({ currentStateRef, currentOpcode, scene, script }) => {
    const animationId = currentOpcode.param;

    playAnimation(
      animationId,
      currentStateRef.current,
      scene,
      script,
      false,
      false
    )
  },
  RANIMEKEEP: ({ currentStateRef, currentOpcode, scene, script }) => {
    const animationId = currentOpcode.param;

    playAnimation(
      animationId,
      currentStateRef.current,
      scene,
      script,
      true,
      false
    )
  },
  RCANIME: ({ currentStateRef, currentOpcode, scene, script, STACK }) => {
    const animationId = currentOpcode.param;
    const firstFrame = STACK.pop() as number;
    const lastFrame = STACK.pop() as number;

    playAnimation(
      animationId,
      currentStateRef.current,
      scene,
      script,
      false,
      false,
      [firstFrame, lastFrame]
    )
  },
  RCANIMEKEEP: ({ currentStateRef, currentOpcode, scene, script, STACK }) => {
    const animationId = currentOpcode.param;
    const firstFrame = STACK.pop() as number;
    const lastFrame = STACK.pop() as number;

    playAnimation(
      animationId,
      currentStateRef.current,
      scene,
      script,
      true,
      false,
      [firstFrame, lastFrame]
    )
  },
  RANIMELOOP: ({ currentStateRef, currentOpcode, scene, script }) => {
    const animationId = currentOpcode.param;

    playAnimation(
      animationId,
      currentStateRef.current,
      scene,
      script,
      false,
      true
    )
  },
  RCANIMELOOP: ({ currentStateRef, currentOpcode, STACK }) => {
    const firstFrame = STACK.pop() as number;
    const lastFrame = STACK.pop() as number;
    const animationId = currentOpcode.param;

    currentStateRef.current.animation = {
      ...currentStateRef.current.animation,
      id: animationId,
      isLooping: true,
    }
  },
  UNUSE: ({ currentStateRef }) => {
    currentStateRef.current.isUnused = true;
  },
  USE: ({ currentStateRef }) => {
    currentStateRef.current.isUnused = false;
  },
  THROUGHON: ({ currentStateRef }) => {
    currentStateRef.current.isSolid = false;
  },
  THROUGHOFF: ({ currentStateRef }) => {
    currentStateRef.current.isSolid = true;
  },
  HIDE: ({ currentStateRef }) => {
    currentStateRef.current.isVisible = false;
  },
  SHOW: ({ currentStateRef }) => {
    currentStateRef.current.isVisible = true;
  },
  SET: ({ currentStateRef, scene, STACK }) => {
    const lastTwo = STACK.splice(-2);
    const walkmesh = scene.getObjectByName('walkmesh') as Group;
    const knownPosition = lastTwo.map(numberToFloatingPoint) as [number, number];
    const vector = new Vector3(knownPosition[0], knownPosition[1], 0);
    const position = getPositionOnWalkmesh(vector, walkmesh);
    if (!position) {
      console.warn('Position not found on walkmesh', vector);
      return;
    }

    currentStateRef.current.position.set([position.x, position.y, position.z]);
  },
  SET3: async ({ currentStateRef, STACK }) => {
    const lastThree = STACK.splice(-3);
    const position = new Vector3(...lastThree.map(numberToFloatingPoint) as [number, number, number]);

    currentStateRef.current.position.set([position.x, position.y, position.z]);
  },
  TALKRADIUS: ({ currentStateRef, STACK }) => {
    const radius = STACK.pop() as number;
    currentStateRef.current.talkRadius = radius;
  },
  PUSHRADIUS: ({ currentStateRef, STACK }) => {
    const radius = STACK.pop() as number;
    currentStateRef.current.pushRadius = radius
  },
  PUSHOFF: ({ currentStateRef }) => {
    currentStateRef.current.isPushable = false;
  },
  PUSHON: ({ currentStateRef }) => {
    currentStateRef.current.isPushable = true;
  },
  TALKOFF: ({ currentStateRef }) => {
    currentStateRef.current.isTalkable = false;
  },
  TALKON: ({ currentStateRef }) => {
    currentStateRef.current.isTalkable = true;
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
  DIRA: ({ STACK }) => {
    // const targetActorId = 
    STACK.pop() as number;
  },
  MSPEED: ({ currentStateRef, STACK }) => {
    const movementSpeed = STACK.pop() as number;
    currentStateRef.current.movementSpeed = movementSpeed;
  },
  MOVE: ({ currentStateRef, STACK }) => {
    // const distanceToStop =
    STACK.pop() as number;
    const lastThree = STACK.splice(-3);
    const position = new Vector3(...lastThree.map(numberToFloatingPoint) as [number, number, number]);
    console.log(lastThree, position)
    return new Promise((resolve) => {
      currentStateRef.current.position.start([position.x, position.y, position.z], {
        immediate: false,
        config: {
          duration: currentStateRef.current.movementSpeed
        },
        onRest: () => {
          resolve();
        }
      });
    })
  },
  // This should keep animation and face direction
  CMOVE: async (...args) => {
    await OPCODE_HANDLERS.MOVE?.(...args);
  },
  // This should keep face direction
  FMOVE: async (...args) => {
    await OPCODE_HANDLERS.MOVE?.(...args);
  },
  FMOVEA: (...args) => {
    OPCODE_HANDLERS.MOVE?.(...args);
  },
  FMOVEP: async (...args) => {
    await OPCODE_HANDLERS.MOVE?.(...args);
  },
  RMOVE: async (...args) => {
    await OPCODE_HANDLERS.MOVE?.(...args);
  },
  DIR: ({ currentStateRef, STACK }) => {
    const angle = STACK.pop() as number;
    currentStateRef.current.angle.set(angle);
  },
  CTURN: turnWithDuration,
  CTURNL: turnWithDuration,
  CTURNR: turnWithDuration,
  LTURNL: turnWithDuration,
  LTURNR: turnWithDuration,
  LTURN: turnWithDuration,
  UNKNOWN6: turnWithDuration,
  UNKNOWN7: turnWithDuration,
  UNKNOWN8: turnWithDuration,
  UNKNOWN9: turnWithDuration,

  // I cannot work out what this does. Also sometimes uses STACK but often doesn't?
  // Only used on two maps though.
  PLTURN: dummiedCommand,


  // TODO: fix
  PCTURN: (args) => {
    const { STACK } = args
    STACK.push(0);
    turnToFacePlayer(args);
  },
  PDIRA: ({ currentStateRef, scene, STACK }) => {
    const actorId = STACK.pop() as number;
    turnToFacePlayer(actorId, currentStateRef, scene);
  },
  // These are technically just meant to be head, but whatever
  FACEDIR: turnToFacePlayer,
  FACEDIRA: turnToFacePlayer,
  FACEDIRP: turnToFacePlayer,
  RFACEDIR: turnToFacePlayer,
  RFACEDIRA: turnToFacePlayer,
  RFACEDIRP: turnToFacePlayer,
  FACEDIRI: ({ STACK }) => {
    STACK.slice(-4);
  },
  FACEDIRLIMIT: ({ STACK }) => {
    STACK.slice(-3);
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
  DOORLINEON: ({ currentStateRef }) => {
    currentStateRef.current.isDoorOn = true;
  },
  DOORLINEOFF: ({ currentStateRef }) => {
    currentStateRef.current.isDoorOn = false;
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
  MUSICLOAD: ({ currentStateRef, STACK }) => {
    currentStateRef.current.backroundMusicId = STACK.pop() as number;
  },
  // PLAYS PRELOADED TRACK
  MUSICCHANGE: ({ currentStateRef }) => {
    console.log('Would play', currentStateRef.current.backroundMusicId)
  },
  MUSICSTOP: ({ currentStateRef, STACK }) => {
    // 0 OR 1. No idea why. It's even sometimes called successively with 1 and 0
    STACK.pop() as number;
    currentStateRef.current.backroundMusicId = undefined;
  },
  MUSICVOL: ({ currentStateRef, STACK }) => {
    // const unknown = 
    STACK.pop() as number;
    const volume = STACK.pop() as number;
    currentStateRef.current.backgroundMusicVolume = volume;
  },
  MUSICVOLTRANS: ({ currentStateRef, STACK }) => {
    // const unknown = 
    STACK.pop() as number;
    // const duration =
    STACK.pop() as number;
    const volume = STACK.pop() as number;
    currentStateRef.current.backgroundMusicVolume = volume;
  },
  // This is used once. I think it restarts the track?
  MUSICREPLAY: () => {
  },
  MUSICSKIP: ({ STACK }) => {
    // const unknown = 
    STACK.pop() as number;
  },
  // This is an assumption
  MUSICSTATUS: ({ currentStateRef, TEMP_STACK }) => {
    const isPlaying = currentStateRef.current.isPlayingBackgroundMusic ? 1 : 0
    TEMP_STACK[0] = isPlaying;
  },
  MUSICVOLFADE: ({ STACK }) => {
    // const unknown = 
    const startVolume = STACK.pop() as number; //maybe?
    const frames = STACK.pop() as number; //maybe?
    const endVolume = STACK.pop() as number;
    STACK.pop() as number; // ???
  },

  LOADSYNC: () => { },
  FOOTSTEPON: () => { },
  SESTOP: ({ STACK }) => {
    // Likely sound effect ID
    STACK.pop() as number;
  },
  LSCROLLP: ({ STACK }) => {
    // Does this scroll to a position? Only has x/y/framecount
    STACK.splice(-3);
  },
  DSCROLLP: ({ STACK }) => {
    // Does this reset the camera?
    // const value = 
    STACK.pop() as number;
    useGlobalStore.setState({
      currentFocusActor: undefined,
    })
  },
  PGETINFO: ({ scene, STACK, TEMP_STACK }) => {
    const partyMemberId = STACK.pop() as number;
    const mesh = getPartyMemberModelComponent(scene, partyMemberId);

    if (!mesh) {
      console.warn('No mesh found for actor ID', partyMemberId);
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
  SPUSYNC: async ({ currentStateRef, STACK }) => {
    const frames = STACK.pop() as number;
    while (currentStateRef.current.spuValue < frames) {
      await wait(100);
    }
  },
  // Unclear which of these three does what
  LADDERANIME: ({ currentStateRef, STACK }) => {
    currentStateRef.current.ladderAnimationId = STACK.pop() as number;
    STACK.splice(-2);
  },
  LADDERDOWN2: async (args) => {
    const { currentOpcode, scene, STACK } = args;
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



  // FAKED
  GAMEOVER: ({ STACK }) => {
    STACK.pop() as number;
    console.error('GAME OVER WHAT DID YOU DO');
  },
  MOVIE: () => {
    MEMORY['80'] = 0;
    setInterval(() => {
      MEMORY['80'] += 100;
      if (MEMORY['80'] === 3000) {
        clearInterval(this);
      }
    }, 1000 / 30);
  },
  ADDGIL: ({ STACK }) => {
    const gil = STACK.pop() as number;
    MEMORY[72] += gil;
  },
  HASITEM: ({ STACK }) => {
    STACK.push(1);
  },

  // TO ADD
  MENUSHOP: () => { },
  DRAWPOINT: ({ STACK }) => {
    // drawpoint ID
    STACK.pop() as number;
  },
  EFFECTPLAY: ({ STACK }) => {
    STACK.splice(-4);
  },
  EFFECTPLAY2: ({ STACK }) => {
    STACK.splice(-3);
  },
  EFFECTLOAD: ({ STACK }) => {
    STACK.pop() as number;
  },
  SAVEENABLE: ({ STACK }) => {
    // const isEnabled =
    STACK.pop() as number;
  },
  SHAKE: ({ STACK }) => {
    //const lastFour =
    STACK.splice(-4);
  },
  SHAKEOFF: () => { },
  MACCEL: ({ STACK }) => {
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
  TUTO: ({ STACK }) => {
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
  // Used once in the balamb basement. I think it might clear a ladder key?
  KEY: ({ STACK }) => {
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
  SETCARD: dummiedCommand,
  ADDSEEDLEVEL: dummiedCommand,
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

  LBL: state => {
    testState = state;
  },
}


//window.setTimeout(() => {
//  console.log(testState)
//  const entries = Object.entries(OPCODE_HANDLERS).map(([key, value]) => {
//    const dummyState = {
//      ...testState,
//      STACK: new Array(100).fill(0),
//    }
//    value(dummyState);
//
//    return [
//      key,
//      100 - dummyState.STACK.length
//    ]
//  });
//
//  console.log(Object.fromEntries(entries))
//}, 5000);
//

export const executeOpcode = async (currentOpcode: Opcode, state: ScriptState, args: Partial<HandlerArgs>) => {
  OPCODE_HANDLERS[currentOpcode]?.({
    activeMethod: {} as ScriptMethod,
    currentOpcode: {} as OpcodeObj,
    opcodes: [],
    scene: new Scene(),
    script: {} as Script,
    TEMP_STACK: {},
    STACK: [],
    ...args,
    currentStateRef: {
      current: state,
    },
  });
}
