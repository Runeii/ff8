import { AnimationAction, AnimationActionLoopStyles, AnimationClip, AnimationMixer, Bone, LoopOnce, LoopPingPong, LoopRepeat } from "three";
import { create } from "zustand";
import { type Object3D } from 'three';
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

export const createAnimationController = (id: string | number, isDebugging = false) => {
  const { getState: getSavedAnimation, setState: setSavedAnimation } = create(() => ({
    idleAnimationIds: {
      standAnimationId: 0,
      walkAnimationId: 0,
      runAnimationId: 0,
    },
    ladderAnimationIds: {
      climbingAnimationId: 0,
      topAnimationId: 0,
      bottomAnimationId: 0,
    }
  }));

  const { getState, setState, subscribe } = create(() => ({
    clips: [] as AnimationClip[],
    mesh: undefined as Object3D | undefined,
    mixer: undefined as AnimationMixer | undefined,

    needsZAdjustment: false,
    id,
    speed: 16, // Default speed, can be adjusted later

    activeAction: undefined as AnimationAction | undefined,
    activeActionId: undefined as string | undefined,

    animations: {
      currentAnimation: undefined as AnimationPlayOptions | undefined,
      isCurrentAnimationABaseAnime: false,
      queuedAnimation: undefined as AnimationPlayOptions | undefined,
    },

    headBone: undefined as Bone | undefined,
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
  const handleAnimationEnded = (activeAnimation: AnimationPlayOptions) => {
    if (!activeAnimation.keepLastFrame) {
      setState(state => ({
        ...state,
        animations: {
          ...state.animations,
          currentAnimation: undefined
        }
      }));
      return;
    }
    const updatedAnimation = {
      ...activeAnimation,
      isCompleted: true,
    };
    setState(state => ({
      ...state,
      animations: {
        ...state.animations,
        currentAnimation: updatedAnimation
      }
    }));
  }

  const tick = (delta: number) => {
    const { activeAction, activeActionId, mixer, mesh } = getState();
    
    if (mixer === undefined || mesh === undefined) {
      return;
    }
    
    const { animations: {
      currentAnimation,
      queuedAnimation
    } } = getState();

    const activeAnimation = [queuedAnimation, currentAnimation].find(anim => anim !== undefined);

    if (!activeAnimation) {
      return;
    }

    const action = activeAnimation?.action;
    const startTime = activeAnimation?.startFrame !== undefined ? activeAnimation.startFrame / FPS : 0;
    const endTime = activeAnimation?.endFrame !== undefined ? activeAnimation.endFrame / FPS : action.getClip().duration;

    if (activeAnimation.key !== activeActionId) {
      mixer.update(0);
      mixer.stopAllAction();
      if (activeAction) {
        activeAction.stop();
        activeAction.reset();
      }
      if (isDebugging) {
        console.log('Starting new animation playback:', {
          previousAction: {...action},
          newAction: {...activeAction},
          startTime,
          endTime,
          currentTime: action.time
        });
      }
      
      action.time = startTime;
      action.enabled = true;
      action.paused = true;
      currentDirection = activeAnimation.speed;

      let needsZAdjustment = true;
      if (activeAnimation.type === 'IDLE') {
        needsZAdjustment = false;
      }

      const { idleAnimationIds } = getSavedAnimation();
      const isAnIdleAnimation = Object.values(idleAnimationIds).includes(activeAnimation.animationId);

      setState({
        needsZAdjustment,
        activeAction: action,
        activeActionId: activeAnimation.key,
        animations: {
          currentAnimation: activeAnimation,
          isCurrentAnimationABaseAnime: isAnIdleAnimation,
          queuedAnimation: undefined
        }
      });

      applyAnimationAtTime(mesh, action.getClip(), startTime);
    }
    
    // If the start frame is the same as the end frame, we apply the animation at that frame and do not change again
    if (startTime === endTime || action.getClip().duration === 0) {
      applyAnimationAtTime(mesh, action.getClip(), startTime);
      handleAnimationEnded(activeAnimation)
      return;
    }

    action.time = action.time + (delta * currentDirection);

    // We are at the end of the animation, so we need to check if we should loop or stop
    if (action.time >= endTime) {
      if (activeAnimation.loop === LoopOnce) {
        action.time = endTime;
        action.paused = true;
        handleAnimationEnded(activeAnimation)
        return;
      }

      if (activeAnimation.loop === LoopPingPong) {
        currentDirection *= -1
        action.time = endTime + (delta * currentDirection);
      } else if (activeAnimation.loop === LoopRepeat) {
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
    const { mixer, clips, speed } = getState();
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
      speed: speed / 16
    }
    playOptions.speed *= options?.speed ?? 1;
    // Exception here. I'm not entirely sure how FF8 handles cases where it is looping the standing animation
    if (animationId === 0 && playOptions.type !== 'IDLE') {
      playOptions.loop = LoopOnce
    }

    setState({
      animations: {
        ...getState().animations,
        queuedAnimation: playOptions,
      }
    });

    let hasStartedPlaying = false;
    return new Promise<void>((resolve) => {
      const checkIsPlaying = () => {
        const { animations: { currentAnimation } } = getState();

        if (!hasStartedPlaying && currentAnimation?.key === uniqueId) {
          hasStartedPlaying = true;
          requestAnimationFrame(checkIsPlaying);
          return;
        }

        if (hasStartedPlaying && (currentAnimation?.key !== uniqueId || currentAnimation?.isCompleted)) {
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
    
    setState(state => ({
      ...state,
      activeAction: undefined,
      animations: {
        ...state.animations,
        currentAnimation: undefined,
      }
    }));
  }

  const pauseAnimation = () => {
    const { activeAction } = getState();
    if (activeAction) {
      activeAction.paused = true;
    }
  }

  const setIdleAnimations = (standAnimationId: number, walkAnimationId: number, runAnimationId: number) => {
    setSavedAnimation({
      idleAnimationIds: {
        standAnimationId,
        walkAnimationId,
        runAnimationId,
      }
    })

    playMovementAnimation('stand')
  }

  const getMovementAnimationId = (type: 'stand' | 'walk' | 'run') => {
    const { idleAnimationIds } = getSavedAnimation();
    if (type === 'stand') {
      return idleAnimationIds.standAnimationId;
    } else if (type === 'walk') {
      return idleAnimationIds.walkAnimationId;
    } else if (type === 'run') {
      return idleAnimationIds.runAnimationId;
    }

    return 0;
  }

  const playMovementAnimation = (type: 'stand' | 'walk' | 'run') => {
    const { animations: {
      currentAnimation,
      queuedAnimation
    } } = getState();


    if (queuedAnimation && queuedAnimation.type !== 'IDLE') {
      return;
    }

    const animationId = getMovementAnimationId(type);

    if (currentAnimation?.type === 'IDLE' && currentAnimation.animationId === animationId) {
      return;
    }

    if (currentAnimation?.type === 'IDLE') {
      stopAnimation();
    }

    return playAnimation(animationId, {
      loop: LoopRepeat,
      type: 'IDLE',
      keepLastFrame: true
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

  const setLadderAnimation = (climbingAnimationId: number, bottomAnimationId: number, topAnimationId: number) => {
    console.log(climbingAnimationId, topAnimationId, bottomAnimationId)
    setSavedAnimation({
      ladderAnimationIds: {
        climbingAnimationId,
        topAnimationId,
        bottomAnimationId: 4
      }
    })
  }

  const playLadderTopAnimation = (direction: 'enter' | 'exit') => {
    const { ladderAnimationIds } = getSavedAnimation();

    return playAnimation(ladderAnimationIds.topAnimationId, {
      startFrame: 0,
      endFrame: undefined,
      loop: LoopOnce,
      keepLastFrame: true,
      type: 'LADDER',
      direction: direction === 'enter' ? -1 : 1
    });
  }

  const playLadderAnimation = () => {
    const { ladderAnimationIds } = getSavedAnimation();

    return playAnimation(ladderAnimationIds.climbingAnimationId, {
      startFrame: 0,
      endFrame: undefined,
      loop: LoopPingPong,
      keepLastFrame: true,
      type: 'LADDER',
      speed: 1.5
    });
  }

  const playLadderBottomAnimation = (direction: 'enter' | 'exit') => {
    const { ladderAnimationIds } = getSavedAnimation();

    return playAnimation(ladderAnimationIds.bottomAnimationId, {
      startFrame: 0,
      endFrame: undefined,
      loop: LoopOnce,
      keepLastFrame: true,
      type: 'LADDER',
      direction: direction === 'enter' ? -1 : 1
    });
  }

  const stopLadderAnimation = () => {
    const { animations: {
      currentAnimation
    } } = getState();

    if (currentAnimation?.type !== 'LADDER') {
      return;
    }
    stopAnimation();
  }

  const setHasAdjustedZ = (hasAdjustedZ: boolean) => {
    setState({
      needsZAdjustment: !hasAdjustedZ,
    });
  }

  return {
    getSavedAnimation,
    getIsPlaying,
    getState,
    subscribe,
    initialize,
    playAnimation,
    pauseAnimation,
    playMovementAnimation,
    getMovementAnimationId,
    setIdleAnimations,
    setAnimationSpeed,
    stopAnimation,
    setHeadBone,
    setLadderAnimation,
    stopLadderAnimation,
    playLadderTopAnimation,
    playLadderBottomAnimation,
    playLadderAnimation,
    tick,
    setHasAdjustedZ
  }
}