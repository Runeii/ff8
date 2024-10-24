/* eslint-disable @typescript-eslint/no-unused-vars */
/* While developing */
import { MutableRefObject } from "react";
import MAP_NAMES from "../../../constants/maps";
import useGlobalStore from "../../../store";
import { getMeshByUserDataValue, numberToFloatingPoint, vectorToFloatingPoint } from "../../../utils";
import { Opcode, OpcodeObj } from "../types";
import { dummiedCommand, remoteExecute, unusedCommand, wait, waitForKeyPress } from "./common";
import { Scene } from "three";

const MEMORY: Record<number, number> = {};

// Seems pointless, but exists
const TEMP_STACK: Record<number, number> = {};

type HandlerFunc = (
  opcodeObj: OpcodeObj,
  opcodes: OpcodeObj[],
  currentIndex: number
) => OpcodeObj[] | void;

type HandlerFuncWithPromise = (
  opcodeObj: OpcodeObj,
  opcodes: OpcodeObj[],
  currentIndex: number
) => Promise<OpcodeObj[] | void>;

export async function executeOpcodes<T>(
  opcodes: OpcodeObj[],
  isExecutionPermitted: MutableRefObject<boolean>,
  isHaltedRef: MutableRefObject<boolean>,
  sceneRef: MutableRefObject<Scene>,
  onUpdate: MutableRefObject<(currentResult: Partial<T>) => void>,
) {
  const STACK: number[] = [];
  const currentResult: Record<string, unknown> = {
    256: 255,
    438: 255,
    439: 255,
    440: 255,
    441: 255,
    442: 255,
  };

  const OPCODE_HANDLERS: Partial<Record<Opcode, HandlerFunc | HandlerFuncWithPromise>> = {
    LBL: () => { },
    RET: () => { },
    PSHI_L: (opcodeObj) => {
      STACK.push(TEMP_STACK[opcodeObj.param]);
    },
    POPI_L: (opcodeObj) => {
      TEMP_STACK[opcodeObj.param] = STACK.pop() as number;
    },
    PSHN_L: (opcodeObj) => {
      STACK.push(opcodeObj.param);
    },
    PSHM_B: (opcodeObj) => {
      STACK.push(MEMORY[opcodeObj.param] ?? 0);
    },
    PSHM_W: (opcodeObj) => {
      STACK.push(MEMORY[opcodeObj.param] ?? 0);
    },
    PSHM_L: (opcodeObj) => {
      STACK.push(MEMORY[opcodeObj.param] ?? 0);
    },
    PSHSM_B: (opcodeObj) => {
      STACK.push(MEMORY[opcodeObj.param] ?? 0);
    },
    PSHSM_W: (opcodeObj) => {
      STACK.push(MEMORY[opcodeObj.param] ?? 0);
    },
    PSHSM_L: (opcodeObj) => {
      STACK.push(MEMORY[opcodeObj.param] ?? 0);
    },
    POPM_L: (opcodeObj) => {
      MEMORY[opcodeObj.param] = STACK.pop() as number;
    },
    POPM_B: (opcodeObj) => {
      MEMORY[opcodeObj.param] = STACK.pop() as number;
    },
    POPM_W: (opcodeObj) => {
      MEMORY[opcodeObj.param] = STACK.pop() as number;
    },
    PSHAC: (opcodeObj: OpcodeObj) => {
      STACK.push(opcodeObj.param);
    },
    CAL: (opcodeObj, opcodes) => {
      const value2 = STACK.pop() as number;
      const value1 = STACK.pop() as number;

      if (opcodeObj.param === 0) {
        STACK.push(value1 + value2);
      } else if (opcodeObj.param === 1) {
        STACK.push(value1 - value2);
      } else if (opcodeObj.param === 2) {
        STACK.push(value1 * value2);
      } else if (opcodeObj.param === 3) {
        STACK.push(value1 / value2);
      } else if (opcodeObj.param === 4) {
        STACK.push(value1 % value2);
      } else if (opcodeObj.param === 5) {
        STACK.push(value1);
        STACK.push(-value2);
      } else if (opcodeObj.param === 6) {
        STACK.push(value1 === value2 ? 1 : 0);
      } else if (opcodeObj.param === 7) {
        STACK.push(value1 > value2 ? 1 : 0);
      } else if (opcodeObj.param === 8) {
        STACK.push(value1 >= value2 ? 1 : 0);
      } else if (opcodeObj.param === 9) {
        STACK.push(value1 < value2 ? 1 : 0);
      } else if (opcodeObj.param === 10) {
        STACK.push(value1 <= value2 ? 1 : 0);
      } else if (opcodeObj.param === 11) {
        STACK.push(value1 !== value2 ? 1 : 0);
      } else if (opcodeObj.param === 12) {
        STACK.push(value1 & value2);
      } else if (opcodeObj.param === 13) {
        STACK.push(value1 | value2);
      } else if (opcodeObj.param === 14) {
        STACK.push(value1 ^ value2);
      } else {
        console.warn(`CAL with param ${opcodeObj.param} not implemented. Script Label ${opcodes[0].param}`);
      }
    },
    // NOTE: Jump logic differs from the original implementation
    // We precalculate the target label name and jump directly to it
    JPF: (opcodeObj, opcodes) => {
      const condition = STACK.pop() as number;
      if (condition === 0) {
        const targetLabelIndex = opcodes.findIndex(opcode => opcode.name === `LABEL${opcodeObj.param}`);
        return opcodes.slice(targetLabelIndex);
      }
    },
    JMP: (opcodeObj, opcodes) => {
      const targetLabelIndex = opcodes.findIndex(opcode => opcode.name === `LABEL${opcodeObj.param}`);
      return opcodes.slice(targetLabelIndex);
    },
    // MODIFIED JUMP LOGIC ENDS
    SETLINE: () => {
      const linePointsInMemory = STACK.splice(-6);
      currentResult.line = {
        start: linePointsInMemory.slice(0, 3),
        end: linePointsInMemory.slice(3),
      };
    },
    UCON: () => {
      useGlobalStore.setState({ isUserControllable: true });
    },
    UCOFF: () => {
      useGlobalStore.setState({ isUserControllable: false });
    },
    LINEON: () => {
      currentResult.isLineOff = false;
    },
    LINEOFF: () => {
      currentResult.isLineOff = true;
    },
    MAPJUMP3: () => {
      const mapJumpDetailsInMemory = STACK.splice(-6);

      useGlobalStore.setState({
        fieldId: MAP_NAMES[mapJumpDetailsInMemory[0]],
        initialAngle: mapJumpDetailsInMemory[4],
        pendingCharacterPosition: vectorToFloatingPoint(mapJumpDetailsInMemory.slice(1, 4) as unknown as [number, number, number]),
      });
    },
    MAPJUMPO: () => {
      STACK.pop() as number; // const walkmeshTriangleId = STACK.pop() as number;
      const fieldId = STACK.pop() as number;
      useGlobalStore.setState({
        fieldId: MAP_NAMES[fieldId],
      });
    },
    HALT: () => {
      isHaltedRef.current = true;
    },
    SETPLACE: () => {
      useGlobalStore.setState({ currentLocationPlaceName: STACK.pop() as number });
    },
    KEYON: async () => {
      const key = STACK.pop() as number;
      await waitForKeyPress(key);
    },
    BGDRAW: () => {
      // I don't think this is actually used
      STACK.pop() as number;
      currentResult.isBackgroundDrawn = true;
    },
    BGOFF: () => {
      currentResult.isBackgroundDrawn = false;
    },
    BGANIMESPEED: () => {
      const speed = STACK.pop() as number;
      currentResult.backgroundAnimationSpeed = speed;
    },
    BGCLEAR: () => {
      // Maybe?
      const unknown = STACK.pop() as number;

      useGlobalStore.setState({
        backgroundLayerVisibility: {
          ...useGlobalStore.getState().backgroundLayerVisibility,
          [unknown + 1]: false
        }
      })
    },
    RBGANIMELOOP: () => {
      const end = STACK.pop() as number;
      const start = STACK.pop() as number
      currentResult.animationLoop = [start, end];
      currentResult.isLooping = true;
    },
    BGSHADE: () => {
      STACK.splice(-7); // const lastSeven = STACK.splice(-7);
    },
    BGANIME: () => {
      const end = STACK.pop() as number;
      const start = STACK.pop() as number

      currentResult.animationLoop = [start, end];
      currentResult.isLooping = false;
    },
    RND: () => {
      TEMP_STACK[0] = Math.round(Math.random() * 255);
    },
    AMES: async () => {
      const y = STACK.pop() as number;
      const x = STACK.pop() as number;
      const id = STACK.pop() as number;
      STACK.pop() as number; // const channel = STACK.pop() as number;

      const { availableMessages, currentMessages } = useGlobalStore.getState();
      useGlobalStore.setState({
        currentMessages: [
          ...currentMessages,
          {
            key: Date.now(),
            id,
            text: availableMessages[id],
            x,
            y,
          }
        ]
      });
      useGlobalStore.setState({ isUserControllable: false });
    },
    AMESW: async () => {
      const y = STACK.pop() as number;
      const x = STACK.pop() as number;
      const id = STACK.pop() as number;
      STACK.pop() as number; // const channel = STACK.pop() as number;

      const { availableMessages, currentMessages } = useGlobalStore.getState();
      useGlobalStore.setState({
        currentMessages: [
          ...currentMessages,
          {
            key: Date.now(),
            id,
            text: availableMessages[id],
            x,
            y,
          }
        ]
      });
      useGlobalStore.setState({ isUserControllable: false });
      while (useGlobalStore.getState().currentMessages.some(message => message.id === id)) {
        await waitForKeyPress(192);
        await wait(100);
      }
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
    ISTOUCH: () => {
      //const actorId = 
      STACK.pop() as number;
      TEMP_STACK[0] = 0; // TODO: 1 if actor is in touching distance of this entity
    },

    SCROLLMODE2: () => {
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

    WAIT: async () => {
      // Runs at 30FPS
      const psxGameFrames = STACK.pop() as number;
      await wait(psxGameFrames / 30 * 1000);
    },
    REQ: () => {
      // I don't think we use ID?
      // const id = opcodeObj.param;
      const label = STACK.pop() as number;

      STACK.pop(); // priority, we don't use it

      remoteExecute(label, sceneRef);
    },
    REQEW: async () => {
      const label = STACK.pop() as number;
      STACK.pop();
      await remoteExecute(label, sceneRef);
    },
    REQSW: () => {
      const label = STACK.pop() as number;
      STACK.pop();
      remoteExecute(label, sceneRef);
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
    ISPARTY: () => {
      const characterID = STACK.pop() as number;
      const indexInParty = useGlobalStore.getState().party.indexOf(characterID)
      TEMP_STACK[0] = indexInParty;
    },
    SETPARTY: () => {
      const character1ID = STACK.pop() as number;
      const character2ID = STACK.pop() as number;
      const character3ID = STACK.pop() as number;

      useGlobalStore.setState({
        party: [character1ID, character2ID, character3ID]
      });
      // We never have any characters in our party
    },
    ADDPARTY: () => {
      const characterID = STACK.pop() as number;
      useGlobalStore.setState({
        party: [...useGlobalStore.getState().party, characterID]
      });
    },
    SUBPARTY: () => {
      const characterID = STACK.pop() as number;
      useGlobalStore.setState({
        party: useGlobalStore.getState().party.filter(id => id !== characterID)
      });
    },
    GETPARTY: () => {
      const index = STACK.pop() as number;
      TEMP_STACK[0] = useGlobalStore.getState().party[index];
    },
    SETPC: () => {
      const partyMemberId = STACK.pop() as number;
      currentResult.partyMemberId = partyMemberId;
      console.log('SETPC', partyMemberId);
    },
    ADDMEMBER: () => {
      const characterID = STACK.pop() as number;
      useGlobalStore.setState({
        availableCharacters: [...useGlobalStore.getState().party, characterID]
      });
    },
    SUBMEMBER: () => {
      const characterID = STACK.pop() as number;
      useGlobalStore.setState({
        availableCharacters: useGlobalStore.getState().availableCharacters.filter(id => id !== characterID),
        party: useGlobalStore.getState().party.filter(id => id !== characterID),
      });
    },
    SETMODEL: (opcodeObj: OpcodeObj) => {
      const modelId = opcodeObj.param;
      currentResult.modelId = modelId;
    },
    BASEANIME: (opcodeObj: OpcodeObj) => {
      const animationId = opcodeObj.param;
      // const firstFrame = 
      STACK.pop() as number;
      // const lastFrame = 
      STACK.pop() as number;
      currentResult.idleAnimationId = animationId;
    },
    // THIS NEEDS TO BE AWAITED
    ANIME: (opcodeObj: OpcodeObj) => {
      const animationId = opcodeObj.param;
      currentResult.animationId = animationId;
      currentResult.isHoldingFinalFrame = false;
    },
    // THIS NEEDS TO BE AWAITED
    ANIMEKEEP: (opcodeObj: OpcodeObj) => {
      const animationId = opcodeObj.param;
      currentResult.animationId = animationId;
      currentResult.isHoldingFinalFrame = true;
    },
    // NEEDS TO ACCEPT A RANGE OF FRAMES
    CANIME: (opcodeObj: OpcodeObj) => {
      // const firstFrame = 
      STACK.pop() as number;
      // const lastFrame = 
      STACK.pop() as number;
      const animationId = opcodeObj.param;
      currentResult.animationId = animationId;
      currentResult.isHoldingFinalFrame = false;
    },
    // NEEDS TO ACCEPT A RANGE OF FRAMES
    CANIMEKEEP: (opcodeObj: OpcodeObj) => {
      // const firstFrame = 
      STACK.pop() as number;
      // const lastFrame = 
      STACK.pop() as number;
      const animationId = opcodeObj.param;
      currentResult.animationId = animationId;
      currentResult.isHoldingFinalFrame = true;
    },
    RANIME: (opcodeObj: OpcodeObj) => {
      const animationId = opcodeObj.param;
      currentResult.animationId = animationId;
      currentResult.isHoldingFinalFrame = false;
    },
    RANIMEKEEP: (opcodeObj: OpcodeObj) => {
      const animationId = opcodeObj.param;
      currentResult.animationId = animationId;
      currentResult.isHoldingFinalFrame = true;
    },
    RANIMELOOP: (opcodeObj: OpcodeObj) => {
      const animationId = opcodeObj.param;
      currentResult.animationId = animationId;
      currentResult.isLooping = true;
    },
    RCANIMEKEEP: (opcodeObj: OpcodeObj) => {
      const animationId = opcodeObj.param;
      currentResult.animationId = animationId;
      currentResult.isHoldingFinalFrame = true;
    },
    RCANIMELOOP: (opcodeObj: OpcodeObj) => {
      const animationId = opcodeObj.param;
      currentResult.animationId = animationId;
      currentResult.isLooping = true;
    },
    UNUSE: () => {
      currentResult.isUnused = true;
    },
    USE: () => {
      currentResult.isUnused = false;
    },
    THROUGHON: () => {
      currentResult.isSolid = false;
    },
    THROUGHOFF: () => {
      currentResult.isSolid = true;
    },
    HIDE: () => {
      currentResult.isVisible = false;
    },
    SHOW: () => {
      currentResult.isVisible = true;
    },
    SET: () => {
      const lastTwo = STACK.splice(-2);
      currentResult.position = [...lastTwo.map(numberToFloatingPoint), undefined] as [number, number, undefined];
      currentResult.movementDuration = 0;
    },
    SET3: () => {
      const lastThree = STACK.splice(-3);
      currentResult.position = lastThree.map(numberToFloatingPoint) as [number, number, number];
      currentResult.movementDuration = 0;
    },
    TALKRADIUS: () => {
      const radius = STACK.pop() as number;
      currentResult.talkRadius = radius;
    },
    PUSHRADIUS: () => {
      const radius = STACK.pop() as number;
      currentResult.pushRadius = radius
    },
    PUSHOFF: () => {
      currentResult.isPushable = false;
    },
    PUSHON: () => {
      currentResult.isPushable = true;
    },
    TALKOFF: () => {
      currentResult.isTalkable = false;
    },
    TALKON: () => {
      currentResult.isTalkable = true;
    },
    SETGETA: () => {
      // const actorId = 
      STACK.pop() as number;
    },
    GETINFO: () => {
      STACK.push(0); // entity X
      STACK.push(0); // entity Y
      STACK.push(0); // entity Z
    },
    DIRA: () => {
      // const targetActorId = 
      STACK.pop() as number;
    },
    MSPEED: () => {
      const movementSpeed = STACK.pop() as number;
      currentResult.movementSpeed = movementSpeed;
    },
    MOVE: () => {
      const frames = STACK.pop() as number;
      const lastThree = STACK.splice(-3);

      currentResult.position = lastThree.map(numberToFloatingPoint) as [number, number, number];
      currentResult.movementDuration = frames;
    },
    DIR: () => {
      const angle = STACK.pop() as number;
      currentResult.angle = angle;
    },
    CTURNL: () => {
      // const duration = 
      STACK.pop() as number;
      const angle = STACK.pop() as number;
      currentResult.angle = angle;
    },
    CTURNR: () => {
      // const duration = 
      STACK.pop() as number;
      const angle = STACK.pop() as number;
      currentResult.angle = angle;
    },

    POLYCOLORALL: () => {
      // const lastThree = 
      STACK.splice(-3);
    },
    SHADELEVEL: () => {
      // const shadeLevel = 
      STACK.pop() as number;
    },
    DOFFSET: () => {
      // const lastThree = 
      STACK.splice(-3);
    },
    RUNDISABLE: () => {
      useGlobalStore.setState({ isRunEnabled: false });
    },
    RUNENABLE: () => {
      useGlobalStore.setState({ isRunEnabled: true });
    },
    DSCROLLA: () => {
      const actorCode = STACK.pop() as number;
      useGlobalStore.setState({
        currentFocusActor: actorCode
      });
    },

    // ?
    MLIMIT: () => {
      // unknown
      STACK.pop() as number;
    },
    SETROOTTRANS: () => {
      // unknown
      STACK.pop() as number;
    },
    INITSOUND: () => { },
    MUSICSTOP: () => {
      // 0 OR 1
      STACK.pop() as number;
    },
    MUSICVOLTRANS: () => {
      STACK.splice(-3);
    },
    MUSICVOLSYNC: () => { },
    LOADSYNC: () => { },
    MUSICVOL: () => {
      STACK.splice(-2);
    },
    FOOTSTEPON: () => { },
    SESTOP: () => {
      // Likely sound effect ID
      STACK.pop() as number;
    },
    LSCROLLP: () => {
      // Does this scroll to a position? Only has x/y
      STACK.splice(-2);
    },
    DSCROLLP: () => {
      // Does this reset the camera?
      // const value = 
      STACK.pop() as number;
      useGlobalStore.setState({
        currentFocusActor: undefined,
      })
    },
    PGETINFO: () => {
      const partyMemberId = STACK.pop() as number;
      const mesh = getMeshByUserDataValue(sceneRef.current, 'partyMemberId', partyMemberId);

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
    DRAWPOINT: () => {
      // drawpoint ID
      STACK.pop() as number;
    },
    EFFECTPLAY: () => { },
    EFFECTPLAY2: () => {
      STACK.splice(-3);
    },
    EFFECTLOAD: () => {
      STACK.pop() as number;
    },
    IDLOCK: () => { },
    IDUNLOCK: () => { },
    SAVEENABLE: () => {
      // const isEnabled =
      STACK.pop() as number;
    },
    SHAKE: () => {
      //const lastFour =
      STACK.splice(-4);
    },
    SHAKEOFF: () => { },

    RBGSHADELOOP: dummiedCommand,
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

  let pendingOpcodes = [...opcodes];

  const runLoop = async (): Promise<void> => {
    return new Promise((resolve) => {
      const loop = async () => {
        if (pendingOpcodes.length === 0 || !isExecutionPermitted?.current) {
          resolve();
          return;
        }

        const opcode = pendingOpcodes.shift() as OpcodeObj;

        if (opcode.name.startsWith('LABEL')) {
          requestAnimationFrame(loop);
          return;
        }

        const handler = OPCODE_HANDLERS[opcode.name];

        if (!handler) {
          console.warn(`No handler for opcode ${opcode.name}. Param: ${opcode.param}`, `Method: ${opcodes[0].param}.`, `Stack: ${STACK}`);
          requestAnimationFrame(loop); // Continue to next iteration
          return;
        }

        // Execute the handler and handle any modified opcodes
        const modifiedOpcodes = await handler(opcode, opcodes, opcodes.length - pendingOpcodes.length);
        if (modifiedOpcodes) {
          pendingOpcodes = modifiedOpcodes;
        }
        onUpdate.current(currentResult as Partial<T>);

        // Schedule the next iteration using requestAnimationFrame
        requestAnimationFrame(loop);
      };

      // Start the loop
      loop();
    });
  };

  // Wait for runLoop to complete
  await runLoop();
}