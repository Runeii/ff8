import useGlobalStore from "../../../store";
import { getPartyMemberEntity } from "../../../utils";
import { HandlerArgs } from "./handlers";

export const turnWithDuration = async ({ currentStateRef, STACK }: HandlerArgs) => {
  const frames = STACK.pop() as number;
  const angle = STACK.pop() as number;
  currentStateRef.current.lookTarget = undefined;
  currentStateRef.current.angle.start(angle, {
    immediate: false,
    config: {
      duration: frames / 15 * 1000,
    }
  });
}

export const turnToFacePlayer = async ({ currentStateRef, scene, opcodes, STACK }: HandlerArgs) => {
  const actorId = STACK.pop() as number;
  const frames = STACK.pop() as number;
  const targetMesh = getPartyMemberEntity(scene, actorId);
  console.trace(actorId, frames, targetMesh, opcodes[0].param)
  currentStateRef.current.lookTarget = targetMesh.position.clone();
}


export const fadeOutMap = async ({ currentStateRef, STACK }: HandlerArgs) => {
  const { fadeSpring, isMapFadeEnabled } = useGlobalStore.getState()
  console.log(fadeSpring, isMapFadeEnabled)
  if (!isMapFadeEnabled) {
    console.log('cancel fade')
    return;
  }
  console.log(fadeSpring, isMapFadeEnabled)
  fadeSpring.opacity.start(0);
}