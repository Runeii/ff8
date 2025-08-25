import { Vector3 } from 'three';
import { create, StoreApi, UseBoundStore } from 'zustand'
import type { Howl} from 'howler';
import { Script } from '../types';
import { sendToDebugger } from '../../../Debugger/debugUtils';

export type ScriptState = {
  characterHeight: number;
  isHalted: boolean;

  ladderAnimationId: number | undefined;

  isDrawPoint: boolean,

  isLineOn: boolean;
  linePoints: Vector3[] | null;

  isVisible: boolean;
  isSolid: boolean;
  isUnused: boolean;

  modelId: number;
  partyMemberId?: number;
  meshTintColor?: number[]

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

  actorMode: number;
}

const createScriptState = (script: Script) => {
  const creator = create<ScriptState>()(() => ({ 
    characterHeight: 0.6, // default to a reasonable height

    isHalted: false,

    animationSpeed: 1,
    currentAnimationId: undefined,
    ladderAnimationId: undefined,

    isDrawPoint: false,

    isLineOn: true,
    linePoints: null,

    isVisible: true,
    isSolid: script.type === 'model',
    isUnused: false,

    modelId: 0,
    partyMemberId: undefined,
    meshTintColor: undefined,

    pushRadius: 0,
    talkRadius: 100,
    isPushable: true,
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

    actorMode: 0
  }))

  
  creator.subscribe((state, prevState) => {
    if (!prevState) {
      return;
    }
    const changedState = Object.keys(state).reduce((acc, key) => {
      // @ts-expect-error Error
      if (state[key] !== prevState[key]) {
        // @ts-expect-error Error
        acc[key] = state[key];
      }
      return acc;
    }, {} as Partial<ScriptState>);
    sendToDebugger('script-state', JSON.stringify({
      id: script.groupId,
      state: changedState
    }));
  });

  return creator;
}

export type ScriptStateStore = UseBoundStore<StoreApi<ScriptState>>

export default createScriptState