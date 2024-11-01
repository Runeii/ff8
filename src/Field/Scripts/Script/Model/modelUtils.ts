import { AnimationAction, LoopOnce, LoopRepeat, Scene } from "three";
import { Script, ScriptState } from "../../types";


export const playAnimation = (
  // @ts-expect-error Temporarily ignore real ID, need to wait for models
  actionIdReal: number,
  currentState: ScriptState,
  scene: Scene,
  script: Script,
  isHoldingFinalFrame = false,
  isLooping = false,
  frames?: number[]
) => {
  const actionId = 1;
  const idleId = currentState.idleAnimationId;

  const modelName =
    currentState.partyMemberId === undefined
      ? `model--${script.groupId}`
      : `party--${currentState.partyMemberId}`;

  const model = scene.getObjectByName(modelName);

  if (!model) {
    return
  }

  const actions = Object.values(model.userData.actions) as AnimationAction[];
  const idleAction = actions[idleId];
  const oneTimeAction = actions[actionId];

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

  const [startFrame, endFrame] = frames ?? [];
  if (startFrame) {
    oneTimeAction.time = startFrame / 30;
  }

  oneTimeAction.play();

  if (isHoldingFinalFrame) {
    return;
  }

  const interval = setInterval(() => {
    if (endFrame && oneTimeAction.time > endFrame / 30) {
      oneTimeAction.stop();
    }
  }, 1000 / 40); // slighty above frame rate

  const onFinished = () => {
    clearInterval(interval);
    mixer.removeEventListener('finished', onFinished)
    idleAction.play();
  }

  mixer.addEventListener('finished', onFinished);
}
