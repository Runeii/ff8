import { Key } from "react";
import MAP_NAMES from "../../constants/maps";
import useGlobalStore from "../../store";
import { vectorToFloatingPoint } from "../../utils";
import { Opcode, OpcodeObj } from "./types";

const KEYS: Record<number, string> = {
  192: 'Space'
}

const waitForKeyPress = (key: number) => {
  return new Promise<void>((resolve) => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === KEYS[key]) {
        window.removeEventListener('keydown', handleKeyPress);
        resolve();
      }
    }

    window.addEventListener('keydown', handleKeyPress);
  });
}

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

export async function executeOpcodes<T>(opcodes: OpcodeObj[]) {
  const STACK: number[] = [];
  const RESULT: Record<string, unknown> = {};

  const OPCODE_HANDLERS: Record<Opcode, HandlerFunc | HandlerFuncWithPromise> = {
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
    POPM_L: (opcodeObj) => {
      MEMORY[opcodeObj.param] = STACK.pop() as number;
    },
    POPM_B: (opcodeObj) => {
      MEMORY[opcodeObj.param] = STACK.pop() as number;
    },
    POPM_W: (opcodeObj) => {
      MEMORY[opcodeObj.param] = STACK.pop() as number;
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
    JPF: (opcodeObj, opcodes) => {
      const condition = STACK.pop() as number;

      if (condition === 0) {
        const labelIndex = opcodes.findIndex((opcode) => opcode.name === `LABEL${opcodeObj.param}`);
        return opcodes.slice(labelIndex);
      }
    },
    JMP: (opcodeObj, opcodes, currentIndex) => {
      const newIndex = opcodeObj.param + currentIndex;
      return opcodes.slice(newIndex);
    },
    SETLINE: () => {
      const linePointsInMemory = STACK.splice(-6);
      RESULT.line = {
        start: linePointsInMemory.slice(0, 3),
        end: linePointsInMemory.slice(3),
      }
    },
    UCON: () => {
      //useGlobalStore.setState({ isUserControllable: true });
    },
    UCOFF: () => {
      //useGlobalStore.setState({ isUserControllable: false });
    },
    LINEOFF: () => {
      RESULT.isLineOff = true;
    },
    MAPJUMP3: () => {
      const mapJumpDetailsInMemory = STACK.splice(-6);

      useGlobalStore.setState({
        fieldId: MAP_NAMES[mapJumpDetailsInMemory[0]],
        initialAngle: mapJumpDetailsInMemory[4],
        pendingCharacterPosition: vectorToFloatingPoint(mapJumpDetailsInMemory.slice(1, 4) as unknown as [number, number, number]),
      });
    },
    HALT: () => {
      RESULT.isHalted = true;
    },
    SETPLACE: () => {
      useGlobalStore.setState({ currentLocationPlaceName: STACK.pop() as number });
    },
    KEYON: async (opCodeObj) => {
      const key = STACK.pop() as number;
      await waitForKeyPress(key);
    },


    // Dummied out
    LSCROLL: () => { },
    WAIT: () => { },
    PREMAPJUMP: () => { },
    PREMAPJUMP2: () => { },
    UNKNOWN10: () => { },

    REQ: (opcodeObj) => {
      const label = STACK.pop();
      const priority = STACK.pop();
    },

    // TO ADD
    MENUSHOP: () => { },
    WINCLOSE: () => { },
    EFFECTPLAY: () => { },
    EFFECTSTOP: () => { },
    EFFECTPLAY2: () => { },
    EFFECTLOAD: () => { },
  }

  let pendingOpcodes = [...opcodes];

  while (pendingOpcodes.length > 0) {
    const opcode = pendingOpcodes.shift() as OpcodeObj;

    if (opcode.name.startsWith('LABEL')) {
      continue;
    }

    const handler = OPCODE_HANDLERS[opcode.name];

    if (!handler) {
      console.warn(`No handler for opcode ${opcode.name}. Param: ${opcode.param}`);
      return;
    }

    const modifiedOpcodes = await handler(opcode, opcodes, opcodes.length - pendingOpcodes.length);
    if (modifiedOpcodes) {
      pendingOpcodes = modifiedOpcodes;
    }
  }

  return RESULT as T;
}