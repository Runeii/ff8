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
  isCompleted?: boolean;
  loop: AnimationActionLoopStyles;
  key: string;
  keepLastFrame: boolean;
  startFrame: number;
  endFrame?: number;
  speed: number;
  type: 'DEFAULT' | 'IDLE' | 'LADDER';
}

type SavedAnimation = {
  animationId: number;
  startFrame?: number;
  endFrame?: number;
}

export const createAnimationController = (id: string | number, _headController: ReturnType<typeof createRotationController>) => {
  const { getState: getSavedAnimation, setState: setSavedAnimation } = create(() => ({
    idleAnimation: undefined as SavedAnimation | undefined,
    ladderAnimation: undefined as SavedAnimation | undefined,
  }));

  const { getState, setState } = create(() => ({
    clips: [] as AnimationClip[],
    mesh: undefined as Object3D | undefined,
    mixer: undefined as AnimationMixer | undefined,

    activeAnimationId: undefined as number | undefined,
    activeAction: undefined as AnimationAction | undefined,
    activeKey: undefined as string | undefined,
    animation: undefined as AnimationPlayOptions | undefined,

    headBone: undefined as Bone | undefined,
    id,
  }));

  const initialize = (mixer: AnimationMixer, clips: AnimationClip[], mesh: Object3D) => {
    setState({
      mixer,
      clips,
      mesh,
    })
    mixer.update(0);
  }

  let currentDirection = 1;
  const tick = (delta: number) => {
    const { activeAction, mixer, mesh } = getState();
    
    if (mixer === undefined || mesh === undefined) {
      return;
    }
    
    const { animation: currentQueueItem } = getState();
    
    if (!currentQueueItem) {
      return;
    }
    const action = currentQueueItem.action;
    const startTime = currentQueueItem.startFrame !== undefined ? currentQueueItem.startFrame / FPS : 0;
    const endTime = currentQueueItem.endFrame !== undefined ? currentQueueItem.endFrame / FPS : action.getClip().duration;

    if (action !== activeAction || currentQueueItem.key !== getState().activeKey ) {
      mixer.update(0);
      mixer.stopAllAction();
      if (activeAction) {
        activeAction.stop();
        activeAction.reset();
      }
      
      action.time = startTime;
      action.enabled = true;
      action.paused = true;
      currentDirection = currentQueueItem.speed;
      setState({
        activeAction: action,
        activeKey: currentQueueItem.key,
        activeAnimationId: currentQueueItem.animationId,
      });
      
      applyAnimationAtTime(mesh, action.getClip(), startTime);
    }

    // If the start frame is the same as the end frame, we apply the animation at that frame and do not change again
    if (startTime === endTime) {
      return;
    }

    action.time = action.time + (delta * currentDirection);

    // We are at the end of the animation, so we need to check if we should loop or stop
    if (action.time >= endTime) {
      if (currentQueueItem.loop === LoopOnce) {
        action.time = endTime;
        action.paused = true;

        if (!currentQueueItem.keepLastFrame) {
          setState({
            activeAction: undefined,
            animation: undefined,
          });
        } else {
          setState(state => ({
            animation: {
              ...state.animation,
              isCompleted: true,
            }
          }));
        }
        return;
      }

      if (currentQueueItem.loop === LoopPingPong) {
        currentDirection *= -1
        action.time = endTime + (delta * currentDirection);
      } else if (currentQueueItem.loop === LoopRepeat) {
        action.time = startTime;
      }
    }


    // Always go up from start time
    if (action.time <= startTime) {
      currentDirection *= -1;
      action.time = startTime + (delta * currentDirection);
    }

    action.paused = true;
    action.play()
    mixer.update(delta);
  }

  const playAnimation = (animationId: number, options?: {
    key?: string;
    loop?: AnimationActionLoopStyles;
    keepLastFrame?: boolean;
    startFrame?: number;
    endFrame?: number;
    priority?: number;
    speed?: number;
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
      speed: options?.speed ?? 1,
    }

    // Exception here. I'm not entirely sure how FF8 handles cases where it is looping the standing animation
    if (animationId === 0) {
      playOptions.loop = LoopOnce
    }

    setState({
      animation: playOptions,
    });

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

  const stopAnimation = () => {
    const { activeAction, mixer } = getState();
    if (!activeAction || !mixer) {
      return;
    }
    
    activeAction.stop();
    activeAction.reset();
    mixer.stopAllAction();
    
    setState({
      activeAction: undefined,
      animation: undefined,
      activeKey: undefined,
      activeAnimationId: undefined,
    });
  }

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

    setSavedAnimation({
      idleAnimation: {
        animationId,
        ...newPlayOptions,
      }
    })

    playAnimation(animationId, newPlayOptions);
  }

  const playIdleAnimation = (animationId?: number) => {
    if (animationId !== undefined) {
      setIdleAnimation(animationId);
    }

    const { idleAnimation } = getSavedAnimation();
    if (!idleAnimation) {
      console.warn('Idle animation not set');
      return;
    }
    return playAnimation(idleAnimation.animationId, {
      startFrame: idleAnimation.startFrame,
      endFrame: idleAnimation.endFrame,
      loop: LoopRepeat,
      type: 'IDLE',
    });
  }

  const setAnimationSpeed = (speed: number) => setState({ speed });

  const getIsPlaying = () => {
    const { activeAction } = getState();
    if (!activeAction || !activeAction.isRunning()) {
      return false;
    }
    return true; 
  }
 

  const setHeadBone = (headBone: Bone) => setState({ headBone });

  const setLadderAnimation = (ladderAnimationId: number, unknownParam1: number, unknownParam2: number) => {
    setSavedAnimation({
      ladderAnimation: {
        animationId: ladderAnimationId,
        startFrame: unknownParam1,
        endFrame: unknownParam2 !== 0 ? unknownParam2 : undefined,
      }
    })
  }

  const playLadderIntroAnimation = () => {
    const { ladderAnimation } = getSavedAnimation();
    if (!ladderAnimation) {
      console.warn('Ladder animation not set');
      return;
    }
    return playAnimation(ladderAnimation.animationId, {
      startFrame: 0,
      endFrame: 16,
      loop: LoopOnce,
      keepLastFrame: true,
      type: 'LADDER',
    });
  }

  const playLadderAnimation = () => {
    const { ladderAnimation } = getSavedAnimation();
    if (!ladderAnimation) {
      console.warn('Ladder animation not set');
      return;
    }
    return playAnimation(ladderAnimation.animationId, {
      startFrame: 16,
      endFrame: undefined,
      loop: LoopPingPong,
      type: 'LADDER',
      speed: 0.6
    });
  }

  const stopLadderAnimation = () => {
    const { animation } = getState();
    if (animation?.type !== 'LADDER') {
      return;
    }
    stopAnimation();
  }

  return {
    getIsPlaying,
    getState,
    initialize,
    playAnimation,
    pauseAnimation,
    playIdleAnimation,
    setIdleAnimation,
    setAnimationSpeed,
    stopAnimation,
    setHeadBone,
    setLadderAnimation,
    stopLadderAnimation,
    playLadderIntroAnimation,
    playLadderAnimation,
    tick
  }
}