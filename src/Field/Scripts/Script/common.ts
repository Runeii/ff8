import useGlobalStore from "../../../store";
import { HandlerArgs } from "./handlers";
import { getPartyMemberModelComponent } from "./Model/modelUtils";
import { openMessage } from "./utils";

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
  const targetMesh = getPartyMemberModelComponent(scene, actorId);
  currentStateRef.current.lookTarget = targetMesh.position.clone();
}


export const fadeOutMap = async () => {
  const { fadeSpring, isMapFadeEnabled } = useGlobalStore.getState()
  if (!isMapFadeEnabled) {
    return;
  }
  fadeSpring.opacity.start(0);
}

export const displayMessage = async (id: number, x: number, y: number, channel: number) => {
  const { availableMessages } = useGlobalStore.getState();

  const uniqueId = `${id}--${Date.now()}`;
  await openMessage(uniqueId, availableMessages[id], x, y);
}