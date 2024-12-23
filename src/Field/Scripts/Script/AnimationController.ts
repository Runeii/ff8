import { AnimationAction, AnimationClip, AnimationMixer, LoopPingPong, LoopRepeat } from "three";

export function createAnimationController() {
  let mixer: AnimationMixer | undefined;
  let clips: AnimationClip[] = [];
  let activeAction: AnimationAction;
  let isPlaying = false;

  let speed = 30;

  const initialize = (mixerInstance: AnimationMixer, animationClips: AnimationClip[]) => {
    mixer = mixerInstance;
    clips = animationClips;
  };

  const animationCompletePromise = (endTime: number): Promise<void> => {
    return new Promise((resolve) => {
      if (!mixer || !activeAction) {
        console.warn("No mixer or active action set. Ensure the GLTF is mounted.");
        resolve(); // Resolve immediately since monitoring can't proceed
        return;
      }

      let raf: number;

      let loopCount = 0;
      const handleLoop = () => {
        loopCount++;
      }
      mixer.addEventListener("loop", handleLoop);

      const cleanup = () => {
        mixer?.removeEventListener("loop", handleLoop);
        cancelAnimationFrame(raf);
        activeAction.paused = true;
        isPlaying = false;
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
    if (!mixer) {
      console.warn("No mixer set. Ensure the GLTF is mounted.");
      return;
    }

    const clip = clips[animationId];
    if (!clip) {
      console.warn("No clip found for animationId:", animationId);
      return;
    }

    activeAction = mixer.clipAction(clip);

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

    isPlaying = true;

    if (isRepeating) {
      return
    }

    return animationCompletePromise(endTime);
  };

  const pauseAnimations = () => {
    if (activeAction) {
      activeAction.paused = true;
    }
    isPlaying = false;
  };

  const stopAnimations = () => {
    if (mixer) {
      mixer.stopAllAction();
      isPlaying = false;
    }
  };

  const setAnimationSpeed = (newSpeed: number) => {
    speed = newSpeed;
  }

  let idleAnimationId: number | undefined = undefined;
  let idleStartFrame: number | undefined = undefined;
  let idleEndFrame: number | undefined = undefined;
  const setIdleAnimation = (animationId: number, startFrame?: number, endFrame?: number) => {
    idleAnimationId = animationId;
    idleStartFrame = startFrame;
    idleEndFrame = endFrame;
  }

  const playIdleAnimation = () => {
    if (idleAnimationId === undefined) {
      console.warn("No idle animation set. Call setIdleAnimation first.");
      return;
    }
    return playAnimation({
      animationId: idleAnimationId,
      startFrame: idleStartFrame,
      endFrame: idleEndFrame,
      isRepeating: true,
    });
  }

  const getIsPlaying = () => isPlaying;

  return {
    initialize,
    playAnimation,
    pauseAnimations,
    stopAnimations,
    getIsPlaying,
    setAnimationSpeed,
    setIdleAnimation,
    playIdleAnimation,
  };
}
