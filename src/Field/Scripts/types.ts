import { Vector3 } from "three";
import { FieldData } from "../Field";
import { OPCODES } from "./constants";
import { SpringValue } from "@react-spring/web";

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
  hasRemovedControl: boolean;
  isHalted: boolean;

  animationProgress: SpringValue<number>;
  animationSpeed: number;
  currentAnimationId: number | undefined;
  idleAnimationId: number | undefined;
  idleAnimationRange: [number, number];

  backgroundAnimationSpring: SpringValue<number>;
  backgroundAnimationSpeed: number;
  isBackgroundVisible: boolean;

  isLineOn: boolean;
  linePoints: Vector3[] | null;

  isVisible: boolean;
  isSolid: boolean;
  isUnused: boolean;

  modelId: number;
  partyMemberId?: number;

  pushRadius: number;
  talkRadius: number;
  isPushable: boolean;
  isTalkable: boolean;

  angle: SpringValue<number>;
  headAngle: SpringValue<number>;

  position: SpringValue<number[]>;
  movementDuration: number;
  movementSpeed: number;

  isDoorOn: boolean;

  backroundMusicId?: number;
  backgroundMusicVolume: number;
  isPlayingBackgroundMusic: boolean;

  spuValue: number;

  countdownTime: number;
  countdownTimer: number | undefined;

  winSize: {
    [key: number]: {
      x: number,
      y: number,
      width: number,
      height: number,
    }
  }
}