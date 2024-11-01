import { Scene, Vector3 } from "three";
import useGlobalStore from "../../../store";
import { getPartyMemberEntity, getPositionOnWalkmesh, numberToFloatingPoint, vectorToFloatingPoint } from "../../../utils";
import { Opcode, OpcodeObj, Script, ScriptMethod, ScriptState } from "../types";
import { asyncSetSpring, dummiedCommand, openMessage, remoteExecute, unusedCommand, wait, waitForKeyPress } from "./utils";
import MAP_NAMES from "../../../constants/maps";
import { MutableRefObject } from "react";
import { Group } from "three";
import { SpringRef } from "@react-spring/web";
import { animateFrames } from "./Background/backgroundUtils";

type HandlerFuncWithPromise = (args: {
  activeMethod: ScriptMethod,
  currentOpcode: OpcodeObj,
  opcodes: OpcodeObj[],
  currentStateRef: MutableRefObject<ScriptState>,
  movementSpring: SpringRef<{ position: number[] }>,
  scene: Scene,
  script: Script,
  signal: AbortSignal,
  STACK: number[],
  TEMP_STACK: Record<number, number>
}) => Promise<number | void> | (number | void);

const MEMORY: Record<number, number> = {
  72: 9999, // gil
  256: 205,
  534: 1,
};

export const OPCODE_HANDLERS: Partial<Record<Opcode, HandlerFuncWithPromise>> = {
  LBL: () => { },
  RET: () => {
    return 999999
  },
  PSHI_L: ({ currentOpcode, STACK, TEMP_STACK }) => {
    STACK.push(TEMP_STACK[currentOpcode.param]);
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
      // STACK.push(value1); //maybe this shouldn't exist?
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
  UCOFF: () => {
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
    });
  },
  MAPJUMP: ({ STACK }) => {
    const mapJumpDetailsInMemory = STACK.splice(-4);

    useGlobalStore.setState({
      fieldId: MAP_NAMES[mapJumpDetailsInMemory[0]],
      pendingCharacterPosition: vectorToFloatingPoint(mapJumpDetailsInMemory.slice(1, 4) as unknown as [number, number, number]),
    });
  },
  MAPJUMP3: ({ STACK }) => {
    const mapJumpDetailsInMemory = STACK.splice(-5);

    useGlobalStore.setState({
      fieldId: MAP_NAMES[mapJumpDetailsInMemory[0]],
      initialAngle: mapJumpDetailsInMemory[4],
      pendingCharacterPosition: vectorToFloatingPoint(mapJumpDetailsInMemory.slice(1, 4) as unknown as [number, number, number]),
    });
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
  KEYON: async ({ STACK }) => {
    const key = STACK.pop() as number;
    await waitForKeyPress(key);
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
  RAMESW: async ({ STACK, script, activeMethod, opcodes }) => {
    const y = STACK.pop() as number;
    const x = STACK.pop() as number;

    const id = STACK.pop() as number;
    STACK.pop() as number; // const channel = STACK.pop() as number;

    const { availableMessages } = useGlobalStore.getState();

    const uniqueId = `${id}--${Date.now()}`;
    console.log('FIRE ONE', script, activeMethod, opcodes)
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
    console.log('result', result, first, last, defaultOpt, cancelOpt)
    TEMP_STACK[0] = result;
    console.log(TEMP_STACK[0])
    useGlobalStore.setState({ isUserControllable: true });
  },

  MESSYNC: () => {
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
  FADEOUT: () => {
    const fadeSpring = useGlobalStore.getState().fadeSpring;
    fadeSpring.opacity.start(0);
  },
  FADEBLACK: () => {
    const fadeSpring = useGlobalStore.getState().fadeSpring;
    fadeSpring.opacity.start(0);
  },
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
  BASEANIME: ({ currentStateRef, currentOpcode, STACK }) => {
    const animationId = currentOpcode.param;
    // const firstFrame = 
    STACK.pop() as number;
    // const lastFrame = 
    STACK.pop() as number;
    currentStateRef.current.idleAnimationId = animationId;
  },
  // THIS NEEDS TO BE AWAITED
  ANIME: ({ currentStateRef, currentOpcode }) => {
    const animationId = currentOpcode.param;

    currentStateRef.current.animation = {
      ...currentStateRef.current.animation,
      id: animationId,
      isHoldingFinalFrame: false,
    }
  },
  // THIS NEEDS TO BE AWAITED
  ANIMEKEEP: ({ currentStateRef, currentOpcode }) => {
    const animationId = currentOpcode.param;

    currentStateRef.current.animation = {
      ...currentStateRef.current.animation,
      id: animationId,
      isHoldingFinalFrame: false,
    }
  },
  // NEEDS TO ACCEPT A RANGE OF FRAMES
  CANIME: ({ currentStateRef, currentOpcode, STACK }) => {
    // const firstFrame = 
    STACK.pop() as number;
    // const lastFrame = 
    STACK.pop() as number;
    const animationId = currentOpcode.param;
    currentStateRef.current.animation = {
      ...currentStateRef.current.animation,
      id: animationId,
      isHoldingFinalFrame: false,
    }
  },
  // NEEDS TO ACCEPT A RANGE OF FRAMES
  CANIMEKEEP: ({ currentStateRef, currentOpcode, STACK }) => {
    // const firstFrame = 
    STACK.pop() as number;
    // const lastFrame = 
    STACK.pop() as number;
    const animationId = currentOpcode.param;

    currentStateRef.current.animation = {
      ...currentStateRef.current.animation,
      id: animationId,
      isHoldingFinalFrame: true,
    }
  },
  RANIME: ({ currentStateRef, currentOpcode }) => {
    const animationId = currentOpcode.param;

    currentStateRef.current.animation = {
      ...currentStateRef.current.animation,
      id: animationId,
      isHoldingFinalFrame: false,
    }
  },
  RANIMEKEEP: ({ currentStateRef, currentOpcode }) => {
    const animationId = currentOpcode.param;

    currentStateRef.current.animation = {
      ...currentStateRef.current.animation,
      id: animationId,
      isHoldingFinalFrame: true,
    }
  },
  RANIMELOOP: ({ currentStateRef, currentOpcode }) => {
    const animationId = currentOpcode.param;

    currentStateRef.current.animation = {
      ...currentStateRef.current.animation,
      id: animationId,
      isLooping: true,
    }
  },
  RCANIMEKEEP: ({ currentStateRef, currentOpcode }) => {
    const animationId = currentOpcode.param;

    currentStateRef.current.animation = {
      ...currentStateRef.current.animation,
      id: animationId,
      isHoldingFinalFrame: true,
    }
  },
  RCANIMELOOP: ({ currentStateRef, currentOpcode }) => {
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
  SET: ({ movementSpring, scene, STACK }) => {
    const lastTwo = STACK.splice(-2);
    const walkmesh = scene.getObjectByName('walkmesh') as Group;
    const knownPosition = lastTwo.map(numberToFloatingPoint) as [number, number];
    const vector = new Vector3(knownPosition[0], knownPosition[1], 0);
    const position = getPositionOnWalkmesh(vector, walkmesh);
    if (!position) {
      console.warn('Position not found on walkmesh', vector);
      return;
    }
    movementSpring.start({
      immediate: true,
      position: [position.x, position.y, position.z]
    });
  },
  SET3: async ({ movementSpring, STACK }) => {
    const lastThree = STACK.splice(-3);
    const position = new Vector3(...lastThree.map(numberToFloatingPoint) as [number, number, number]);

    movementSpring.start({
      immediate: true,
      position: [position.x, position.y, position.z]
    });
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
  GETINFO: ({ STACK }) => {
    STACK.push(0); // entity X
    STACK.push(0); // entity Y
    STACK.push(0); // entity Z
  },
  DIRA: ({ STACK }) => {
    // const targetActorId = 
    STACK.pop() as number;
  },
  MSPEED: ({ currentStateRef, STACK }) => {
    const movementSpeed = STACK.pop() as number;
    currentStateRef.current.movementSpeed = movementSpeed;
  },
  MOVE: async ({ currentStateRef, movementSpring, STACK }) => {
    // const distanceToStop =
    STACK.pop() as number;
    const lastThree = STACK.splice(-3);
    const position = new Vector3(...lastThree.map(numberToFloatingPoint) as [number, number, number]);

    await asyncSetSpring(movementSpring, {
      immediate: false,
      config: {
        duration: currentStateRef.current.movementSpeed * 4
      },
      position: [position.x, position.y, position.z],
    });
  },
  // This should keep animation and face direction
  CMOVE: async (...args) => {
    await OPCODE_HANDLERS.MOVE?.(...args);
  },
  // This should keep face direction
  FMOVE: async (...args) => {
    await OPCODE_HANDLERS.MOVE?.(...args);
  },
  RMOVE: async (...args) => {
    await OPCODE_HANDLERS.MOVE?.(...args);
  },
  DIR: ({ currentStateRef, STACK }) => {
    const angle = STACK.pop() as number;
    currentStateRef.current.angle = angle;
  },
  CTURNL: ({ currentStateRef, STACK }) => {
    // const duration = 
    STACK.pop() as number;
    const angle = STACK.pop() as number;
    currentStateRef.current.angle = angle;
  },
  CTURNR: ({ currentStateRef, STACK }) => {
    // const duration = 
    STACK.pop() as number;
    const angle = STACK.pop() as number;
    currentStateRef.current.angle = angle;
  },
  // TODO: fix
  PCTURN: ({ scene, STACK }) => {
    // const speed =
    STACK.pop() as number;
    // const unknown =
    STACK.pop() as number;

    //const targetMesh =
    getPartyMemberEntity(scene, 0);
  },
  // I imagine rotates to player
  PDIRA: ({ STACK }) => {
    // const actorId = 
    STACK.pop() as number;
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
  MUSICSTOP: ({ STACK }) => {
    // 0 OR 1
    STACK.pop() as number;
  },
  MUSICVOLTRANS: ({ STACK }) => {
    STACK.splice(-3);
  },
  MUSICVOLSYNC: () => { },
  LOADSYNC: () => { },
  MUSICVOL: ({ STACK }) => {
    STACK.splice(-2);
  },
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
  PGETINFO: ({ scene, STACK, TEMP_STACK }) => {
    const partyMemberId = STACK.pop() as number;
    const mesh = getPartyMemberEntity(scene, partyMemberId);

    if (!mesh) {
      console.warn('No mesh found for actor ID', partyMemberId);
      return;
    }

    const { x, y, z } = mesh.position;
    TEMP_STACK[0] = x;
    TEMP_STACK[1] = y;
    TEMP_STACK[2] = z;
  },


  GAMEOVER: () => {
    console.error('GAME OVER WHAT DID YOU DO');
  },

  // TO ADD
  MENUSHOP: () => { },
  DRAWPOINT: ({ STACK }) => {
    // drawpoint ID
    STACK.pop() as number;
  },
  EFFECTPLAY: () => { },
  EFFECTPLAY2: ({ STACK }) => {
    STACK.splice(-3);
  },
  EFFECTLOAD: ({ STACK }) => {
    STACK.pop() as number;
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
  MOVIE: () => {
    MEMORY['80'] = 0;
    setInterval(() => {
      MEMORY['80'] += 100;
      if (MEMORY['80'] === 3000) {
        clearInterval(this);
      }
    }, 1000 / 30);
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
  ADDGIL: ({ STACK }) => {
    const gil = STACK.pop() as number;
    MEMORY[72] += gil;
  },
  PARTICLEON: ({ STACK }) => {
    STACK.pop() as number;
  },
  SHADESET: ({ STACK }) => {
    STACK.pop() as number;
  },

  JOIN: dummiedCommand,
  FOLLOWOFF: dummiedCommand,
  FOLLOWON: dummiedCommand,
  REFRESHPARTY: dummiedCommand,

  RBGSHADELOOP: ({ STACK }) => {
    STACK.splice(-10);
  },
  LSCROLL: dummiedCommand,
  PREMAPJUMP: dummiedCommand,
  PREMAPJUMP2: dummiedCommand,
  UNKNOWN10: dummiedCommand,
  UNKNOWN16: dummiedCommand,
  MESMODE: dummiedCommand,
  BATTLEON: dummiedCommand,
  BATTLEOFF: dummiedCommand,
  BATTLEMODE: dummiedCommand,
  BATTLE: dummiedCommand,
  BATTLERESULT: dummiedCommand,
  BATTLECUT: dummiedCommand,
  PHSENABLE: dummiedCommand,
  MUSICLOAD: dummiedCommand,
  MUSICCHANGE: dummiedCommand,
  MENUENABLE: dummiedCommand,
  MENUDISABLE: dummiedCommand,
  SETDRAWPOINT: dummiedCommand,
  JUNCTION: dummiedCommand,
  MOVIESYNC: dummiedCommand,
  REST: dummiedCommand,

  NOP: unusedCommand,
  GJMP: unusedCommand,
  DEBUG: unusedCommand,
  MESW: unusedCommand,
  ISMEMBER: unusedCommand,
  MESFORCUS: unusedCommand,
  SHADETIMER: unusedCommand,
  STOPVIBRATE: unusedCommand,
  ENDING: unusedCommand,
  ALLSEPOS: unusedCommand,
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
  OPENEYES: unusedCommand,
  BLINKEYES: unusedCommand,
  SETPARTY2: unusedCommand,
  DYING: unusedCommand,
}
