import { FieldData } from "../Field";
import { OPCODES } from "./constants";

export type ScriptType = 'location' | 'model' | 'background' | 'unknown' | 'door';

export type Opcode = typeof OPCODES[keyof typeof OPCODES]

export type OpcodeObj = {
  key: number;
  name: Opcode;
  param: number;
}

export type ScriptMethod = Omit<FieldData['scripts'][number]['methods'][number], 'opcodes'> & {
  opcodes: OpcodeObj[];
}

export type Script = Omit<FieldData['scripts'][number], 'methods' | 'type'> & {
  methods: ScriptMethod[];
  type: ScriptType;
};
