import { AnimationAction, AnimationClip, AnimationMixer, LoopPingPong, LoopRepeat } from "three";
import { create } from "zustand";


export const createAnimationController = () => {
  const playAnimation = (animationId: number, {
    loop,
    keepLastFrame,
    startFrame,
    endFrame,
  }: {
    loop?: boolean;
    keepLastFrame?: boolean;
    startFrame?: number;
    endFrame?: number;
  } = {
    loop: false,
    keepLastFrame: false,
    startFrame: undefined,
    endFrame: undefined,
  }) => {

  }

  const stopAnimation = () => {}

  const setIdleAnimation = (animationId: number, startFrame: number, endFrame: number) => {}

  const setAnimationSpeed = (speed: number) => {}

  const getIsPlaying = () => {
    return true;
  }

  return {
    getIsPlaying,
    playAnimation,
    setIdleAnimation,
    setAnimationSpeed,
    stopAnimation,
  }
}