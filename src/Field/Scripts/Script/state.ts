import { SpringValue } from '@react-spring/web';
import { Vector3 } from 'three';
import { create, StoreApi, UseBoundStore } from 'zustand'

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

export const createScriptState = () => {
  return create<ScriptState>()(() => ({
    hasRemovedControl: false,
    isHalted: false,

    animationProgress: new SpringValue(0),
    animationSpeed: 1,
    currentAnimationId: undefined,
    idleAnimationId: undefined,
    idleAnimationRange: [0, 0],

    backgroundAnimationSpring: new SpringValue(0),
    backgroundAnimationSpeed: 200,
    isBackgroundVisible: false,

    isLineOn: true,
    linePoints: null,

    isVisible: true,
    isSolid: false,
    isUnused: false,

    modelId: 0,
    partyMemberId: undefined,

    pushRadius: 0,
    talkRadius: 200,
    isPushable: false,
    isTalkable: true,

    angle: new SpringValue(0),
    headAngle: new SpringValue(0),

    position: new SpringValue([0, 0, 0]),
    movementDuration: 0,
    movementSpeed: 0,

    isDoorOn: true,

    backroundMusicId: 0,
    backgroundMusicVolume: 127,
    isPlayingBackgroundMusic: false,

    spuValue: 0,

    countdownTime: 0,
    countdownTimer: undefined,
    winSize: {}
  }))
}

export type ScriptStateStore = UseBoundStore<StoreApi<ScriptState>>

export default createScriptState;