import { AnimationAction, AnimationClip, AnimationMixer, Object3D } from "three";
import { create } from "zustand"
import { applyAnimationAtTime } from "./animationUtils";

type AnimationItem = {
  id: string;
  priority: number;

  action: AnimationAction
  clipId: number;

  startTime: number;
  endTime: number;

  direction: number;
  speed: number;

  isLooping: boolean;
  shouldHoldLastFrame: boolean;

  hasBeenZAdjusted: boolean;
  needsRealtimeZAdjustment: boolean;
}

type RunState = {
  direction: number;
  isComplete: boolean;
  time: number;
}

export const createAnimationController = (id: string | number) => {
  const {getState: getSavedAnimation, setState: setSavedAnimation } = create(() => ({
    standingId: 0,
    walkingId: 1,
    runningId: 2,
  }));

  const { getState, setState } = create(() => ({
    // We assume these three are always available due to initialize
    mixer: undefined as unknown as AnimationMixer,
    clips: [] as AnimationClip[],
    mesh: undefined as unknown as Object3D,

    activeAnimation: undefined as AnimationItem | undefined,
    animationSpeed: 16, // Default speed, can be adjusted later
  }));

  let currentRunState: RunState | undefined = undefined;

  const handleAnimationEnded = (uniqueId: string, shouldHoldLastFrame: boolean) => {
    if (!currentRunState) {
      return;
    }

    currentRunState.isComplete = true;

    const event = new CustomEvent('animationEnd', {
      detail: uniqueId
    });
    document.dispatchEvent(event);

    if (shouldHoldLastFrame) {
      return
    }
    
    const mixer = getState().mixer;
    mixer.stopAllAction();
    mixer.update(0);
    setState({ activeAnimation: undefined });
  }

  const tick = (delta: number) => {
    const activeAnimation = getState().activeAnimation;
    if (!activeAnimation) {
      return;
    }

    const { mixer, mesh } = getState();
    const { action, direction, startTime, endTime } = activeAnimation;

    action.enabled = true;

    // New run
    if (!currentRunState) {
      currentRunState = {
        isComplete: false,
        time: startTime,
        direction: direction,
      };
      applyAnimationAtTime(mesh, action.getClip(), startTime);
    }

    // Zero frames of animation, just set it to time
    if (startTime === endTime || action.getClip().duration === 0) {
      applyAnimationAtTime(mesh, action.getClip(), startTime);

      if (!currentRunState.isComplete) {
        handleAnimationEnded(activeAnimation.id, activeAnimation.shouldHoldLastFrame);
      }
      return;
    }

    // Animation has completed and holding last frame
    if (currentRunState.isComplete && activeAnimation.shouldHoldLastFrame) {
      applyAnimationAtTime(mesh, action.getClip(), endTime);
      return;
    }

    currentRunState.time += currentRunState.direction * delta;

    if (currentRunState.time >= endTime && activeAnimation.isLooping && direction === 1) {
      currentRunState.time = startTime;
    }
    
    if (currentRunState.time <= startTime && activeAnimation.isLooping && direction === -1) {
      currentRunState.time = endTime;
    }

    // Completed, clean it up
    if (currentRunState.time >= endTime && !activeAnimation.isLooping && direction === 1) {
      handleAnimationEnded(activeAnimation.id, activeAnimation.shouldHoldLastFrame);
      return;
    }
    if (currentRunState.time <= startTime && !activeAnimation.isLooping && direction === -1) {
      handleAnimationEnded(activeAnimation.id, activeAnimation.shouldHoldLastFrame);
      return;
    }

    action.time = currentRunState.time;
    action.paused = true;
    action.play()
    mixer.update(delta);
  }

  const playAnimation = (clipId: number, options?: {
      isLooping?: boolean;
      shouldHoldLastFrame?: boolean;
      startFrame?: number;
      endFrame?: number;
      priority?: number;
      speed?: number;
      direction?: number;
      needsRealtimeZAdjustment?: boolean;
    }) => {
    const clip = getState().clips[clipId]
    if (!clip) {
      console.warn(`Animation with ID ${clipId} not found`);
      return;
    }

    const { mixer } = getState();
  
    const action = mixer.clipAction(clip);

    const frameRate = 30;

    const startTime =
      options?.startFrame !== undefined ? options.startFrame / frameRate : 0;
    const endTime =
      options?.endFrame !== undefined ? options.endFrame / frameRate : action.getClip().duration;

    const uniqueId =  `${id}-${clipId}--${Date.now()}`
    const animation: AnimationItem = {
      action,
      id: uniqueId,
      clipId,
      direction: 1,
      startTime,
      endTime,
      isLooping: options?.isLooping ?? false,
      shouldHoldLastFrame: options?.shouldHoldLastFrame ?? false,
      priority: options?.priority ?? 5,
      speed: options?.speed ?? 1,
      hasBeenZAdjusted: false,
      needsRealtimeZAdjustment: options?.needsRealtimeZAdjustment ?? true
    }

    currentRunState = undefined;
    const currentlyActiveAnimation = getState().activeAnimation;
    if (currentlyActiveAnimation) {
      handleAnimationEnded(currentlyActiveAnimation.id, currentlyActiveAnimation.shouldHoldLastFrame);
      currentlyActiveAnimation.action.stop();
    }

    setState({
      activeAnimation: animation
    });

    return new Promise<void>((resolve) => {
      const handler = ({ detail }: { detail: string}) => {
        if (detail === uniqueId) {
          document.removeEventListener('animationEnd', handler);
          resolve();
        }
      };
      document.addEventListener('animationEnd', handler);
    })
  }

  const initialize = (mixer: AnimationMixer, clips: AnimationClip[], mesh: Object3D) => {
    setState({
      mixer,
      clips,
      mesh,
    })
    mixer.update(0);
  }

  const setAnimationSpeed = (speed: number) => setState({ animationSpeed: speed });

  const getIsPlaying = () => {
    const activeAnimation = getState().activeAnimation;
    if (!activeAnimation) {
      return false;
    }
    if (activeAnimation && currentRunState?.isComplete) {
      return false;
    }
    return true;
  }

  const setIdleAnimations = (standingId: number, walkingId: number, runningId: number) => {
    setSavedAnimation({
      standingId,
      walkingId,
      runningId
    })
  }

  const getSavedAnimationId =  (type: 'standing' | 'walking' | 'running') => {
    const savedAnimations = getSavedAnimation();
    if (type === 'standing') {
      return savedAnimations.standingId;
    } else if (type === 'walking') {
      return savedAnimations.walkingId;
    } else if (type === 'running') {
      return savedAnimations.runningId;
    }
  }

  const playMovementAnimation = (animationName: 'standing' | 'walking' | 'running') => {
    const animationId = getSavedAnimationId(animationName);
    if (animationId === undefined) {
      return;
    }

    const { activeAnimation } = getState();
    if (animationId === activeAnimation?.clipId && activeAnimation?.isLooping) {
      return;
    }
    if (id === 1) {
      console.log(`Playing ${animationName} animation`);
    }
    playAnimation(animationId, {
      isLooping: true,
      shouldHoldLastFrame: true,
      needsRealtimeZAdjustment: false
    });
  }

  const setHasAdjustedZ = (hasAdjustedZ: boolean) => {
    const activeAnimation = getState().activeAnimation;
    if (!activeAnimation) {
      return;
    }
    setState({
      activeAnimation: {
        ...activeAnimation,
        hasBeenZAdjusted: hasAdjustedZ,
      }
    })
  }

  return {
    tick,
    playAnimation,
    initialize,
    setAnimationSpeed,
    getIsPlaying,
    getSavedAnimation,
    setIdleAnimations,
    playMovementAnimation,
    getSavedAnimationId,
    setHasAdjustedZ,
    
    getState,

    subscribe: () => {},
    stopAnimation: () => {},
    setHeadBone: () => {},
    setLadderAnimation: () => {},
    stopLadderAnimation: () => {},
    playLadderTopAnimation: () => {},
    playLadderBottomAnimation: () => {},
    playLadderAnimation: () => {},
  }
}