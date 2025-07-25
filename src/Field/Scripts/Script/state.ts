import { SpringValue } from '@react-spring/web';
import { Vector3 } from 'three';
import { create, StoreApi, UseBoundStore } from 'zustand'
import type { Howl} from 'howler';
import { Script } from '../types';

export type ScriptState = {
  characterHeight: number;
  hasRemovedControl: boolean;
  isHalted: boolean;

  ladderAnimationId: number | undefined;

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

  isHeadTrackingPlayer: boolean;

  isDoorOn: boolean;

  pendingBackgroundMusic?: Howl;
  pendingBackgroundMusicSrc?: string;

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

export const createScriptState = (script: Script) => {
  return create<ScriptState>()(() => ({ 
    characterHeight: 0.6, // default to a reasonable height

    hasRemovedControl: false,
    isHalted: false,

    animationSpeed: 1,
    currentAnimationId: undefined,
    ladderAnimationId: undefined,

    backgroundAnimationSpring: new SpringValue(0),
    backgroundAnimationSpeed: 200,
    isBackgroundVisible: false,

    isLineOn: true,
    linePoints: null,

    isVisible: true,
    isSolid: script.type === 'model',
    isUnused: false,

    modelId: 0,
    partyMemberId: undefined,

    pushRadius: 0,
    talkRadius: 200,
    isPushable: false,
    isTalkable: true,

    isHeadTrackingPlayer: false,

    isDoorOn: true,

    backroundMusicId: 0,
    backgroundMusicVolume: 127,
    isPlayingBackgroundMusic: false,

    spuValue: 0,

    countdownTime: 0,
    countdownTimer: undefined,
    winSize: {},

    pendingBackgroundMusic: undefined,
    pendingBackgroundMusicSrc: undefined,
  }))
}

export type ScriptStateStore = UseBoundStore<StoreApi<ScriptState>>

export default createScriptState;