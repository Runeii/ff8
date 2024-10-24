import { AnimationAction, LoopOnce, LoopRepeat } from "three";

export const getAnimationById = (actions: Record<string, AnimationAction>, id: number) => {
  return Object.values(actions)[id];
}

export const playAnimation = (
  actions: Record<string, AnimationAction>,
  actionId: number,
  idleActionId: number,
  isHoldingFinalFrame = false,
  isLooping = false
) => {
  const idleAction = getAnimationById(actions, idleActionId);
  const oneTimeAction = getAnimationById(actions, actionId);

  if (!idleAction || !oneTimeAction) {
    return;
  }

  const mixer = oneTimeAction.getMixer();

  idleAction.stop();
  if (isLooping) {
    oneTimeAction.reset().setLoop(LoopRepeat, Infinity);
  } else {
    oneTimeAction.reset().setLoop(LoopOnce, 1).clampWhenFinished = true;
  }

  oneTimeAction.play();

  if (!isHoldingFinalFrame) {
    const onFinished = () => {
      mixer.removeEventListener('finished', onFinished)
      idleAction.play();
    }

    mixer.addEventListener('finished', onFinished);
  }
}
