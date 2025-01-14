import { AnimationAction, AnimationClip, AnimationMixer, LoopPingPong, LoopRepeat } from "three";
import { create } from "zustand";

type AnimationControllerState = {
  mixer: AnimationMixer | undefined;
  clips: AnimationClip[];
  activeAction: AnimationAction | undefined;
  isPlaying: boolean;
  speed: number;

  currentlyPlayingIdleAnimationId: number | undefined;
  idleAnimationId: number | undefined;
  idleStartFrame: number | undefined;
  idleEndFrame: number | undefined;
}

export function createAnimationController() {
  const state = create<AnimationControllerState>()(() => ({
    mixer: undefined,
    clips: [],
    activeAction: undefined,
    isPlaying: false,
    speed: 30,
    
    currentlyPlayingIdleAnimationId: undefined,
    idleAnimationId: undefined,
    idleStartFrame: undefined,
    idleEndFrame: undefined,
  }));

  let raf: number;

  const initialize = (mixerInstance: AnimationMixer, animationClips: AnimationClip[]) => {
    state.setState({
      mixer: mixerInstance,
      clips: animationClips,
    });
  };

  const animationCompletePromise = (endTime: number): Promise<void> => {
    const { isPlaying, mixer, activeAction } = state.getState();

    return new Promise((resolve) => {
      if (!mixer || !activeAction) {
        console.warn("No mixer or active action set. Ensure the GLTF is mounted.");
        resolve(); // Resolve immediately since monitoring can't proceed
        return;
      }

      let loopCount = 0;
      const handleLoop = () => {
        loopCount++;
      }
      mixer.addEventListener("loop", handleLoop);

      const cleanup = () => {
        mixer?.removeEventListener("loop", handleLoop);
        cancelAnimationFrame(raf);
        activeAction.paused = true;
        state.setState({ isPlaying: false });
        resolve()
      }

      const checkProgress = () => {
        const currentTime = activeAction.time + activeAction.getClip().duration * loopCount;
        if (!isPlaying || currentTime >= endTime) {
          cleanup();
          return;
        }
        raf = requestAnimationFrame(checkProgress);
      };

      raf = requestAnimationFrame(checkProgress);
    });
  };

  // TODO:
  // Support looping properly (eg: idle)
  // Do we need to allow starting during repeat phase?
  const playAnimation = async ({
    animationId,
    startFrame,
    endFrame,
    isRepeating = false,
  }: {
    animationId: number;
    speed?: number;
    startFrame?: number;
    endFrame?: number;
    isRepeating?: boolean;
  }) => {
    const { mixer, clips, speed } = state.getState();
  
    if (!mixer) {
      console.warn("No mixer set. Ensure the GLTF is mounted.");
      return;
    }

    const clip = clips[animationId];
    if (!clip) {
      console.warn("No clip found for animationId:", animationId);
      return;
    }

    const activeAction = mixer.clipAction(clip);

    if (!activeAction) {
      console.warn("No active action set. Ensure activeAnimationId is valid.");
      return;
    }

    mixer.stopAllAction();
    activeAction.reset();

    // Seems animations are calculated assuming a 60FPS?
    const FPS = 30;

    const timeScale = speed / FPS; // Calculate time scale based on FPS
    activeAction.setEffectiveTimeScale(timeScale);

    activeAction.setLoop(isRepeating ? LoopRepeat : LoopPingPong, Infinity);
    activeAction.clampWhenFinished = true;

    const duration = activeAction.getClip().duration;
    const totalFrames = Math.ceil(duration * FPS);

    const startTime = startFrame ? (startFrame / totalFrames) * duration : 0;
    const endTime = endFrame ? (endFrame / totalFrames) * duration : duration;
    activeAction.time = startTime; // Set start time directly
    activeAction.play();

    state.setState({
      activeAction,
      isPlaying: true
    });

    if (isRepeating) {
      return
    }

    return animationCompletePromise(endTime);
  };

  const pauseAnimations = () => {
    const { activeAction } = state.getState();
    if (activeAction) {
      activeAction.paused = true;
    }
    state.setState({ isPlaying: false });
  };

  const stopAnimations = () => {
    const { mixer } = state.getState();
    if (mixer) {
      mixer.stopAllAction();
      state.setState({ isPlaying: false });
      window.cancelAnimationFrame(raf);
    }
  };

  const setAnimationSpeed = (newSpeed: number) => {
    state.setState({ speed: newSpeed });
  }

  const setIdleAnimation = (animationId: number, startFrame?: number, endFrame?: number) => {
    state.setState({
      idleAnimationId: animationId,
      idleStartFrame: startFrame,
      idleEndFrame: endFrame,
    });
  }

  const playIdleAnimation = () => {
    const { currentlyPlayingIdleAnimationId, idleAnimationId, idleStartFrame, idleEndFrame } = state.getState();

    if (idleAnimationId === undefined) {
      console.warn("No idle animation set. Call setIdleAnimation first.");
      return;
    }

    if (currentlyPlayingIdleAnimationId === idleAnimationId) {
      return;
    }

    state.setState({ currentlyPlayingIdleAnimationId: idleAnimationId });

    return playAnimation({
      animationId: idleAnimationId,
      startFrame: idleStartFrame,
      endFrame: idleEndFrame,
      isRepeating: true,
    });
  }

  return {
    initialize,
    playAnimation,
    pauseAnimations,
    stopAnimations,
    subscribe: state.subscribe,
    getIsPlaying: () => state.getState().isPlaying,
    setAnimationSpeed,
    setIdleAnimation,
    playIdleAnimation,
  };
}
