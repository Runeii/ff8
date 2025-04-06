import {opcodeCount} from './opcodes.js';

console.log(Object.fromEntries(Object.entries(opcodeCount).sort(([_,a], [_b,b]) => b - a)))