import { AnimationAction, AnimationActionLoopStyles, AnimationClip, AnimationMixer, Bone, LoopOnce, LoopPingPong, LoopRepeat } from "three";
import { create } from "zustand";
import { type Object3D } from 'three';
import createRotationController from "../RotationController/RotationController";
import { applyAnimationAtTime } from "./animationUtils";

const FPS = 25;

type AnimationPlayOptions = {
  action: AnimationAction;
  animationId: number;
  direction: number;
  loop: AnimationActionLoopStyles;
  key: string;
  keepLastFrame: boolean;
  startFrame: number;
  endFrame?: number;
  type: 'DEFAULT' | 'IDLE' | 'LADDER';
}

export const createAnimationController = (id: string | number, _headController: ReturnType<typeof createRotationController>) => {
  const { getState, setState } = create(() => ({
    clips: [] as AnimationClip[],
    mesh: undefined as Object3D | undefined,
    mixer: undefined as AnimationMixer | undefined,

    savedLadderAnimation: {
      animationId: 0,
      startFrame: 0,
      endFrame: undefined,
    } as {
      animationId: number;
      startFrame: number;
      endFrame?: number;
    },

    activeAnimationId: undefined as number | undefined,
    activeAction: undefined as AnimationAction | undefined,
    activeKey: undefined as string | undefined,
    animation: undefined as AnimationPlayOptions | undefined,
    idleAnimation: undefined as AnimationPlayOptions | undefined,
    ladderAnimation: undefined as AnimationPlayOptions | undefined,

    headBone: undefined as Bone | undefined,
    id,
    speed: FPS,
  }));

  const initialize = (mixer: AnimationMixer, clips: AnimationClip[], mesh: Object3D) => {
    setState({
      mixer,
      clips,
      mesh,
    })
    mixer.update(0);
  }

  const updateByType = (updatedItem: AnimationPlayOptions | undefined, type: 'DEFAULT' | 'IDLE' | 'LADDER') => {
    if (type === 'DEFAULT') {
      setState({
        animation: updatedItem,
      });
    } else if (type === 'IDLE') {
      setState({
        idleAnimation: updatedItem,
      });
    } else if (type === 'LADDER') {
      setState({
        ladderAnimation: updatedItem,
      });
    }
  }

  const tick = (delta: number) => {
    const {
      activeAction,
      mixer,
      mesh,
      animation,
      idleAnimation,
      ladderAnimation,
    } = getState();

    if (mixer === undefined || mesh === undefined) {
      return;
    }

    const queue = [idleAnimation, ladderAnimation, animation].filter(Boolean);
    const currentQueueItem = queue.at(-1);

    if (!currentQueueItem) {
      mixer.update(0);
      return;
    }

    const action = currentQueueItem.action;
    if (action !== activeAction || currentQueueItem.key !== getState().activeKey ) {
      mixer.update(0);
      mixer.stopAllAction();
      if (activeAction) {
        activeAction.stop();
        activeAction.reset();
      }
      
      action.time = currentQueueItem.startFrame / FPS;
      action.enabled = true;

      setState({
        activeAction: action,
        activeKey: currentQueueItem.key,
        activeAnimationId: currentQueueItem.animationId,
      });
    }

    const endTime = currentQueueItem.endFrame !== undefined ? currentQueueItem.endFrame / FPS : action.getClip().duration;

    if (action.time === endTime || Number.isNaN(action.time) || currentQueueItem.startFrame === currentQueueItem.endFrame) {
      applyAnimationAtTime(mesh, action.getClip(), (currentQueueItem.endFrame ?? currentQueueItem.startFrame) / FPS);
    }

    if (currentQueueItem.loop !== LoopOnce) {
      const startTime = currentQueueItem.startFrame / FPS;
      const endTime = currentQueueItem.endFrame !== undefined
        ? currentQueueItem.endFrame / FPS
        : action.getClip().duration;

      if (!action.isRunning() && action.time !== endTime) {
        action.play();
        action.paused = false;
        return;
      }

      const buffer = 0.001;
      
      if (action.time <= startTime + buffer) {
        action.timeScale = 1;
      }
      
      if (action.time >= endTime - buffer) {
        action.timeScale = -1;
      }

      return;
    }

    if (action.time >= endTime && !currentQueueItem.loop) {
      return;
    }

    action.play();
    action.setLoop(LoopOnce, 1);
    action.paused = true;
    action.time += delta;

    if (action.time < endTime) {
      mixer.update(delta);
      return;
    }

    action.paused = true;

    if (currentQueueItem.keepLastFrame) {
      return;
    }

    updateByType(undefined, currentQueueItem.type);
    action.stop();
    action.reset();
    mixer.stopAllAction();
  }

  const playAnimation = (animationId: number, options?: {
    key?: string;
    loop?: AnimationActionLoopStyles;
    keepLastFrame?: boolean;
    startFrame?: number;
    endFrame?: number;
    priority?: number;
    type?: 'DEFAULT' | 'IDLE' | 'LADDER';
  }) => {
    const { mixer, clips } = getState();
    const clip = clips[animationId]

    if (!clip) {
      console.warn(`Animation with id ${animationId} not found`);
      return;
    }
    if (mixer === undefined) {
      console.warn(`Mixer is not initialized for animation with id ${animationId}`);
      return;
    }

    const action = mixer.clipAction(clip);

    const uniqueId = `${id}-${animationId}--${Date.now()}`;
    const playOptions: AnimationPlayOptions = {
      action,
      animationId,
      direction: 1,
      key: options?.key ?? uniqueId,
      startFrame: options?.startFrame ?? 0,
      endFrame: options?.endFrame ?? undefined,
      loop: options?.loop ?? LoopOnce,
      keepLastFrame: options?.keepLastFrame ?? false,
      type: options?.type ?? 'DEFAULT',
    }

    if (playOptions.type === 'DEFAULT') {
      setState({
        animation: playOptions,
      })
    } else if (playOptions.type === 'IDLE') {
      setState({
        idleAnimation: playOptions,
      })
    } else if (playOptions.type === 'LADDER') {
      setState({
        ladderAnimation: playOptions,
      })
    }

    return new Promise<void>((resolve) => {
      const checkIsPlaying = () => {
        const { activeAction } = getState();

        if ((activeAction === action || !activeAction) && (!activeAction || !activeAction.isRunning())) {
          resolve();
        } else {
          requestAnimationFrame(checkIsPlaying);
        }
      };
      checkIsPlaying();
    });
  }

  const stopAnimation = () => {}

  const pauseAnimation = () => {
    const { activeAction } = getState();
    if (activeAction) {
      activeAction.paused = true;
    }
  }

  const setIdleAnimation = (animationId: number, startFrame?: number, endFrame?: number) => {
    const newPlayOptions: Partial<AnimationPlayOptions> = {
      loop: LoopRepeat,
      startFrame: startFrame ?? 0,
      endFrame: endFrame,
      type: 'IDLE',
    }

    const { idleAnimation } = getState();

    if (
      idleAnimation &&
      (
        animationId === idleAnimation.animationId &&
        idleAnimation.startFrame === newPlayOptions.startFrame &&
        idleAnimation.endFrame === newPlayOptions.endFrame &&
        idleAnimation.loop === newPlayOptions.loop
      )
    ) {
      return;
    }
    playAnimation(animationId, newPlayOptions);
  }

  const setAnimationSpeed = (speed: number) => setState({ speed });

  const getIsPlaying = () => {
    const { activeAction } = getState();
    if (!activeAction || !activeAction.isRunning()) {
      return false;
    }
    return true; 
  }

  const isPlayingIdle = () => {
    const { idleAnimation, activeAction } = getState();
    if (!idleAnimation || !activeAction) {
      return false;
    }
    return idleAnimation.action === activeAction && activeAction.isRunning();
  }

  const setHeadBone = (headBone: Bone) => setState({ headBone });

  const setLadderAnimation = (ladderAnimationId: number, unknownParam1: number, unknownParam2: number) => {
    setState({
      savedLadderAnimation: {
        animationId: ladderAnimationId,
        startFrame: unknownParam1,
        endFrame: unknownParam2 !== 0 ? unknownParam2 : undefined,
      }
    })
  }

  const playLadderIntroAnimation = () => {
    const { savedLadderAnimation } = getState();
    playAnimation(savedLadderAnimation.animationId, {
      startFrame: 0,
      endFrame: savedLadderAnimation.startFrame,
      loop: LoopOnce,
      keepLastFrame: true,
      type: 'LADDER',
    });
  }

  const playLadderAnimation = () => {
    const { savedLadderAnimation } = getState();
    playAnimation(savedLadderAnimation.animationId, {
      startFrame: savedLadderAnimation.startFrame,
      endFrame: savedLadderAnimation.endFrame,
      loop: LoopPingPong,
      type: 'LADDER',
    });
  }

  return {
    getIsPlaying,
    getState,
    initialize,
    isPlayingIdle,
    playAnimation,
    pauseAnimation,
    setIdleAnimation,
    setAnimationSpeed,
    stopAnimation,
    setHeadBone,
    setLadderAnimation,
    playLadderIntroAnimation,
    playLadderAnimation,
    tick
  }
}