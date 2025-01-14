import {  RawFieldData } from "../Field";
import { OPCODES } from "./constants";

export type ScriptType = 'location' | 'model' | 'background' | 'unknown' | 'door';

export type Opcode = typeof OPCODES[number]

export type OpcodeObj = {
  name: Opcode;
  label?: string;
  param: number;
}

export type ScriptMethod = Omit<RawFieldData['scripts'][number]['methods'][number], 'opcodes'> & {
  opcodes: OpcodeObj[];
}

export type Script = Omit<RawFieldData['scripts'][number], 'methods' | 'type'> & {
  methods: ScriptMethod[];
  type: ScriptType;
};
