import { Group, Object3D, Scene } from "three";
import useGlobalStore from "../../../../store";

export const getScriptEntity = (scene: Scene, scriptGroupId: number) => {
  return scene.getObjectByName(`entity--${scriptGroupId}`) as Group;
}

export const getPartyMemberModelComponent = (scene: Scene, partyMemberIndex: number): Group | null => {
  const { party } = useGlobalStore.getState();
  const partyMemberId = party[partyMemberIndex];
  if (partyMemberId === undefined) {
    return null;
  }
  const partyMemberGroup= scene.getObjectByName(`party--${partyMemberId}`) as Object3D;
  if (!partyMemberGroup) {
    //console.warn(`Party member model ${partyMemberId}/${partyMemberIndex} not found`);
    return null;
  }

  return partyMemberGroup.parent as Group;
}

export const getPlayerEntity = (scene: Scene): Group | null => {
  const { party } = useGlobalStore.getState();
  const partyMemberId = party[0];
  const groupWrapper = scene.getObjectByName(`party--${partyMemberId}`) as Group;
  if (!groupWrapper) {
    console.warn("Player entity not found in scene");
    return null;
  }
  return groupWrapper.parent as Group;
}