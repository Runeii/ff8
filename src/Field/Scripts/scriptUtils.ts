import MAP_NAMES from "../../constants/maps";
import useGlobalStore from "../../store";
import { vectorToFloatingPoint } from "../../utils";
import { Opcode, OpcodeObj } from "./types";

const KEYS: Record<number, string> = {
  192: 'Space'
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

export async function executeOpcodes<T>(opcodes: OpcodeObj[], setResult: (result: T) => void): Promise<void> {
  const STACK: number[] = [];

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
    JPF: (opcodeObj, opcodes, currentIndex) => {
      const condition = STACK.pop() as number;
      if (opcodes[0].param === 131) {
        console.log('JPF', condition);
      }
      if (condition === 0) {
        const newIndex = opcodeObj.param + currentIndex;
        return opcodes.slice(newIndex);
      }
    },
    JMP: (opcodeObj, opcodes, currentIndex) => {
      const newIndex = opcodeObj.param + currentIndex + 1;
      return opcodes.slice(newIndex);
    },
    SETLINE: () => {
      const linePointsInMemory = STACK.splice(-6);
      setResult(currentResult => ({
        ...currentResult,
        line: {
          start: linePointsInMemory.slice(0, 3),
          end: linePointsInMemory.slice(3),
        }
      }));
    },
    UCON: () => {
      //useGlobalStore.setState({ isUserControllable: true });
    },
    UCOFF: () => {
      //useGlobalStore.setState({ isUserControllable: false });
    },
    LINEOFF: () => {
      setResult(currentResult => ({
        ...currentResult,
        isLineOff: true
      }));
    },
    MAPJUMP3: (opcodeObj, opcodes) => {
      const mapJumpDetailsInMemory = STACK.splice(-6);
      console.log('MAPJUMP3', mapJumpDetailsInMemory, opcodeObj, opcodes);
      useGlobalStore.setState({
        fieldId: MAP_NAMES[mapJumpDetailsInMemory[0]],
        initialAngle: mapJumpDetailsInMemory[4],
        pendingCharacterPosition: vectorToFloatingPoint(mapJumpDetailsInMemory.slice(1, 4) as unknown as [number, number, number]),
      });
    },
    MAPJUMPO: () => {
      const walkmeshTriangleId = STACK.pop() as number;
      const fieldId = STACK.pop() as number;
      useGlobalStore.setState({
        fieldId: MAP_NAMES[fieldId],
      });
    },
    HALT: () => {
      setResult(currentResult => ({
        ...currentResult,
        isHalted: true
      }));
    },
    SETPLACE: () => {
      useGlobalStore.setState({ currentLocationPlaceName: STACK.pop() as number });
    },
    KEYON: async () => {
      const key = STACK.pop() as number;
      console.log('KEYON', key, opcodes);
      await waitForKeyPress(key);
    },
    BGDRAW: () => {
      // I don't think this is actually used
      STACK.pop() as number;
      setResult(currentResult => ({
        ...currentResult,
        isBackgroundDrawn: true
      }));
    },
    BGOFF: () => {
      setResult(currentResult => ({
        ...currentResult,
        isBackgroundDrawn: false
      }));
    },
    BGANIMESPEED: () => {
      const speed = STACK.pop() as number;

      setResult(currentResult => ({
        ...currentResult,
        backgroundAnimationSpeed: speed
      }));
    },
    RBGANIMELOOP: () => {
      const end = STACK.pop() as number;
      const start = STACK.pop() as number

      setResult(currentResult => ({
        ...currentResult,
        animationLoop: [start, end],
        isLooping: true,
      }));
    },
    BGSHADE: () => {
      const lastSeven = STACK.splice(-7);
    },
    BGANIME: () => {
      const end = STACK.pop() as number;
      const start = STACK.pop() as number

      setResult(currentResult => ({
        ...currentResult,
        animationLoop: [start, end],
        isLooping: true,
      }));
    },
    RND: () => {
      TEMP_STACK[0] = Math.round(Math.random() * 255);
    },
    AMESW: async () => {
      const y = STACK.pop() as number;
      const x = STACK.pop() as number;
      const id = STACK.pop() as number;
      const channel = STACK.pop() as number;

      const { currentMessages } = useGlobalStore.getState();
      useGlobalStore.setState({
        currentMessages: [
          ...currentMessages,
          {
            id,
            text: id.toString(),
            x,
            y,
          }
        ]
      });
      useGlobalStore.setState({ isUserControllable: false });
      await waitForKeyPress(192);
      useGlobalStore.setState({ isUserControllable: true });
      useGlobalStore.setState({
        currentMessages: currentMessages.filter(message => message.id !== id)
      });
    },

    SCROLLMODE2: () => {
      const lastFive = STACK.splice(-5);
      const layer = lastFive[0]; // I think this is the layer
      const x = lastFive[1];
      const y = lastFive[2];
      const unknown1 = lastFive[3];
      const unknown2 = lastFive[4];
    },

    // Dummied out
    RBGSHADELOOP: () => { },
    LSCROLL: () => { },
    WAIT: () => { },
    PREMAPJUMP: () => { },
    PREMAPJUMP2: () => { },
    UNKNOWN10: () => { },

    REQ: (opcodeObj) => {
      const id = opcodeObj.param;
      const label = STACK.pop();
      const priority = STACK.pop();
    },
    REQSW: (opcodeObj) => {
      const id = opcodeObj.param;
      const label = STACK.pop();
      const priority = STACK.pop();
      console.log('REQSW', id, label, priority);
    },

    // TO ADD
    MENUSHOP: () => {
      console.log('shop');
    },
    WINCLOSE: () => { },
    EFFECTPLAY: () => { },
    EFFECTPLAY2: () => { },
    EFFECTLOAD: () => { },
  }

  let pendingOpcodes = [...opcodes];

  const runLoop = async (): Promise<void> => {
    return new Promise((resolve) => {
      const loop = async () => {
        if (pendingOpcodes.length === 0) {
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
          console.warn(`No handler for opcode ${opcode.name}. Param: ${opcode.param}`, `Method: ${opcodes[0].param}`);
          requestAnimationFrame(loop); // Continue to next iteration
          return;
        }

        // Execute the handler and handle any modified opcodes
        const modifiedOpcodes = await handler(opcode, opcodes, opcodes.length - pendingOpcodes.length);
        if (modifiedOpcodes) {
          pendingOpcodes = modifiedOpcodes;
        }

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