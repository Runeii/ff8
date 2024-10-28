import { Vector3 } from "three";
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

export type ScriptState = {
  animation: {
    id: number;
    isHoldingFinalFrame: boolean;
    isLooping: boolean;
  },
  idleAnimationId: number;

  backgroundAnimationSpeed: number,
  backgroundStartFrame: number,
  backgroundEndFrame: number,
  isBackgroundLooping: boolean
  isBackgroundVisible: boolean;

  isLineOn: boolean;
  linePoints: Vector3[] | null;

  isVisible: boolean;
  isSolid: boolean;
  isUnused: boolean;

  modelId: number;
  partyMemberId: number;

  pushRadius: number;
  talkRadius: number;
  isPushable: boolean;
  isTalkable: boolean;

  angle: number;
  position: Vector3;
  movementDuration: number;
  movementSpeed: number;
}