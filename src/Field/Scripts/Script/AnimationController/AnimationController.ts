import { AnimationAction, AnimationClip, AnimationMixer, Bone, LoopOnce, LoopRepeat } from "three";
import { create } from "zustand";
import { type Object3D } from 'three';
import createRotationController from "../RotationController/RotationController";
import { subclip } from "three/src/animation/AnimationUtils.js";

const FPS = 30;

type AnimationPlayOptions = {
  isIdleAnimation?: boolean;
  loop?: boolean;
  keepLastFrame?: boolean;
  startFrame?: number;
  endFrame?: number;
}

export const createAnimationController = (id: string | number, _headController: ReturnType<typeof createRotationController>) => {
  const { getState, setState } = create(() => ({
    clips: [] as AnimationClip[],
    mesh: undefined as Object3D | undefined,
    mixer: undefined as AnimationMixer | undefined,

    isPlaying: false,

    playback: {
      action: undefined as AnimationAction | undefined,
      animationId: undefined as number | undefined,
      options: {} as AnimationPlayOptions | undefined,
    },

    headBone: undefined as Bone | undefined,
    id,
    idle: {
      animationId: undefined as number | undefined,
      startFrame: undefined as number | undefined,
      endFrame: undefined as number | undefined,
    },
    speed: FPS,

    ladderAnimationId: undefined as number | undefined,
  }));

  const handleAnimationEnd = (event: { action: AnimationAction }) => {
    const { action } = event;

    const { idle, playback } = getState();

    if (playback.options?.isIdleAnimation || action.loop === LoopRepeat) {
      return;
    }
    
    setState({
      isPlaying: false,
    });


    if (playback.options?.keepLastFrame) {
      action.paused = true;
      return;
    }

    if (idle.animationId) {
      playIdleAnimation();
    }
  }

  const initialize = (mixer: AnimationMixer, clips: AnimationClip[], mesh: Object3D) => {
    setState({
      mixer,
      clips,
      mesh,
    })

    mixer.addEventListener('finished', handleAnimationEnd);
  }

  const playAnimation = (animationId: number, options?: {
    isIdleAnimation?: boolean;
    loop?: boolean;
    keepLastFrame?: boolean;
    startFrame?: number;
    endFrame?: number;
  }) => {
    const {
      isIdleAnimation,
      loop,
      keepLastFrame,
      startFrame,
      endFrame,
    } = {
      isIdleAnimation: false,
      loop: false,
      keepLastFrame: false,
      ...options,
    }

    const { mixer, clips } = getState();
    const sourceClip = clips[animationId]

    const uniqueId = `${id}-${animationId}--${Date.now()}`;
    const clip = subclip(sourceClip, uniqueId, 0, endFrame ?? sourceClip.duration * FPS, FPS);

    if (!clip) {
      console.warn(`Animation with id ${animationId} not found`);
      return;
    }
    if (mixer === undefined) {
      console.warn(`Mixer is not initialized for animation with id ${animationId}`);
      return;
    }
    mixer.stopAllAction();
    const action = mixer.clipAction(clip);
    if (startFrame) {
      action.time = Math.min(clip.duration, startFrame / FPS)
    }
    action.clampWhenFinished = keepLastFrame ?? false;
    action.setLoop(loop ? LoopRepeat : LoopOnce, loop ? Infinity : 1);
    action.play();

    setState({
      isPlaying: true,
      playback: {
        action,
        animationId,
        options
      }
    });

    return new Promise<void>((resolve) => {
      const checkIsPlaying = () => {
        const { isPlaying } = getState();
        if (!isPlaying) {
          resolve();
        } else {
          requestAnimationFrame(checkIsPlaying);
        }
      };
      checkIsPlaying();
    });
  }

  const stopAnimation = () => {}

  const pauseAnimation = () => {}

  const playIdleAnimation = () => {
    const { idle, playback } = getState();
    if (idle.animationId === undefined) {
      return;
    }
    if (playback.options?.isIdleAnimation === false) {
      return;
    }

    if (
      idle.animationId === playback.animationId &&
      idle.startFrame === playback.options?.startFrame &&
      idle.endFrame === playback.options?.endFrame
    ) {
      return;
    }
return
    console.log(`Script ${id}::: Playing idle animation with id ${idle.animationId}`, idle);
    playAnimation(idle.animationId, {
      isIdleAnimation: true,
      startFrame: idle.startFrame,
      endFrame: idle.endFrame,
      loop: true,
    });
  }

  const setIdleAnimation = (animationId: number, startFrame?: number, endFrame?: number) => {
    setState({
      idle: {
        animationId,
        startFrame: startFrame ?? undefined,
        endFrame: endFrame ?? undefined,
      }
    });

    playIdleAnimation();
  }

  const setAnimationSpeed = (speed: number) => setState({ speed });

  const getIsPlaying = () => {
    const {isPlaying} = getState();
    return isPlaying || false;
  }

  const setHeadBone = (headBone: Bone) => setState({ headBone });

  const setLadderAnimation = (ladderAnimationId: number, _unknownParam1: number, _unknownParam2: number) => setState({ ladderAnimationId });

  return {
    getIsPlaying,
    getState,
    initialize,
    playAnimation,
    pauseAnimation,
    setIdleAnimation,
    setAnimationSpeed,
    stopAnimation,
    setHeadBone,
    setLadderAnimation
  }
}