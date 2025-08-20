import { OpcodeObj } from "../../types";

export const checkifIsActionableMethod = (opcodes: OpcodeObj[]): boolean => {
  const ACTIONABLE_METHODS = ['LBL', 'RET', 'HALT'];
  return opcodes.filter(opcode => !opcode.name.startsWith('LABEL') && !ACTIONABLE_METHODS.includes(opcode.name)).length > 0;
};
