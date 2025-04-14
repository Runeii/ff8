import { AnimationAction, AnimationClip, AnimationMixer, Bone, LoopOnce, LoopRepeat } from "three";
import { create } from "zustand";
import { type Object3D } from 'three';
import { applyBaseAnimationDirectly } from "./animationUtils";
import createRotationController from "../RotationController/RotationController";

const FPS = 30;

export const createAnimationController = (id: string | number, headController: ReturnType<typeof createRotationController>) => {
  const { getState, setState } = create(() => ({
    activeAnimationId: undefined as number | undefined,
    clips: [] as AnimationClip[],
    headBone: undefined as Bone | undefined,
    isPlaying: false,
    isIdle: false,
    id,
    idle: {
      animationId: undefined as number | undefined,
      startFrame: undefined as number | undefined,
      endFrame: undefined as number | undefined,
    },
    ladderAnimationId: undefined as number | undefined,
    mesh: undefined as Object3D | undefined,
    mixer: undefined as AnimationMixer | undefined,
    playback: {
      action: undefined as AnimationAction | undefined,
      endTime: 0,
      loop: false,
    },
    resumeIdleOnComplete: false,
    speed: FPS,
  }));

  const handleAnimationComplete = () => {
    setState({
      activeAnimationId: undefined,
      isPlaying: false,
    });

    if (id === 1) {
      console.log('ended')
    }
    window.removeEventListener('frame', handleFrame);

    if (getState().resumeIdleOnComplete) {
      if (id === 1) {
        console.log('resume ended')
      }
      requestIdleAnimation();
    }
  }

  const handleApplyHeadRotation = () => {
    const {headBone} = getState();
    if (!headBone) {
      return;
    }
    const {angle} = headController.getState();
    const radians = (angle.get() / 256) * 2 * Math.PI;
    headBone.rotation.y = radians;
  }

  const handleFrame = ({detail: { delta }}: {detail: {delta: number}}) => {
    const { action, endTime, loop } = getState().playback;
    if (!action) {
      return;
    }
    const timeScale = getState().speed / FPS;
    action.time += Math.min(delta * timeScale, 1 / FPS);

    
    // 0 is the reset pose with 0 duration, we manually apply this to the mesh
    if (getState().activeAnimationId === 0) {
      applyBaseAnimationDirectly(getState().mesh!, action.getClip());
      handleApplyHeadRotation();
      return;
    }

    handleApplyHeadRotation();
    
    if (action.time >= endTime && !loop) {
      action.paused = true;
      handleAnimationComplete();
      return;
    }
  }


  const playAnimation = (animationId: number, {
    loop,
    keepLastFrame,
    startFrame,
    endFrame,
    isIdle,
  }: {
    isIdle?: boolean;
    loop?: boolean;
    keepLastFrame?: boolean;
    startFrame?: number;
    endFrame?: number;
  } = {
    isIdle: false,
    loop: false,
    keepLastFrame: false,
    startFrame: undefined,
    endFrame: undefined,
  }) => {
    const clip = getState().clips[animationId];
    if (!clip) {
      console.warn('Animation clip not found', animationId);
      return;
    }


    const mixer = getState().mixer;
    if (!mixer) {
      console.warn('Animation mixer not found');
      return;
    }
    setState({
      isPlaying: true,
    });

    const duration = clip.duration;
    const totalFrames = Math.ceil(duration * FPS);

    const startOffsetInFrames = (startFrame ?? 0) / totalFrames;
    const endOffsetInFrames = (endFrame ?? totalFrames) / totalFrames;

    const startTime = duration * startOffsetInFrames;
    const endTime = duration * endOffsetInFrames;

    const action = mixer.clipAction(clip);
    action.clampWhenFinished = keepLastFrame ?? false;
    action.loop = loop ? LoopRepeat : LoopOnce;

    setState({
      resumeIdleOnComplete: !loop && !keepLastFrame,
      playback: {
        action,
        endTime,
        loop: !!loop,
      },
    });

    mixer.stopAllAction();

    action.time = startTime;

    window.addEventListener('frame', handleFrame);

    action.play();

    setState({
      activeAnimationId: animationId,
      isIdle,
    });
  }

  const stopAnimation = () => {
    setState({ isPlaying: false });
  }

  const setIdleAnimation = (animationId: number, startFrame?: number, endFrame?: number) => {
    if (animationId === getState().idle.animationId && startFrame === getState().idle.startFrame && endFrame === getState().idle.endFrame) {
      return;
    }

    setState({
      idle: {
        animationId,
        startFrame: startFrame ?? undefined,
        endFrame: endFrame ?? undefined,
      }
    });

    requestIdleAnimation();  
  }

  const requestIdleAnimation = () => {
    const { activeAnimationId, idle, isIdle } = getState();

    // If there's no idle animation, do nothing
    if (idle.animationId === undefined) {
      return;
    }

    // If we're already playing the idle animation, do nothing
    if (isIdle && idle.animationId === activeAnimationId) {
      return;
    }

    // If we're playing an animation and it's not the idle animation, do nothing
    if (!isIdle && activeAnimationId) {
      return;
    }

    playAnimation(idle.animationId, {
      isIdle: true,
      loop: true,
      startFrame: idle.startFrame,
      endFrame: idle.endFrame,
    });
  }

  const setAnimationSpeed = (speed: number) => setState({ speed });

  const getIsPlaying = () => {
    const { isPlaying, isIdle } = getState();

    return isPlaying && !isIdle;
  }

  const initialize = (mixer: AnimationMixer, clips: AnimationClip[], mesh: Object3D) => {
    if (clips.length === getState().clips.length && mixer === getState().mixer) {
      return;
    }

    mixer.addEventListener('finished', handleAnimationComplete);
    setState({ mixer, clips, mesh });
  }

  const setHeadBone = (headBone: Bone) => {
    if (headBone === getState().headBone) {
      return;
    }
    setState({ headBone });
  }

  const setLadderAnimation = (ladderAnimationId: number, _unknownParam1: number, _unknownParam2: number) => {
    if (ladderAnimationId === getState().ladderAnimationId) {
      return;
    }
    setState({ ladderAnimationId });
  }

  return {
    getIsPlaying,
    getState,
    initialize,
    playAnimation,
    requestIdleAnimation,
    setIdleAnimation,
    setAnimationSpeed,
    stopAnimation,
    setHeadBone,
    setLadderAnimation
  }
}