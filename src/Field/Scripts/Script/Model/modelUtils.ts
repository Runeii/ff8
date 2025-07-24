import { Group, Object3D, Scene } from "three";
import useGlobalStore from "../../../../store";

export const getScriptEntity = (scene: Scene, scriptGroupId: number) => {
  return scene.getObjectByName(`entity--${scriptGroupId}`) as Group;
}

export const getPartyMemberModelComponent = (scene: Scene, partyMemberIndex: number) => {
  const { party } = useGlobalStore.getState();
  const partyMemberId = party[partyMemberIndex];
  const partyMemberModel = scene.getObjectByName(`party--${partyMemberId}`) as Object3D;
  if (!partyMemberModel) {
    //console.warn(`Party member model ${partyMemberId}/${partyMemberIndex} not found`);
    return null;
  }
  return partyMemberModel;
}

export const getPlayerEntity = (scene: Scene) => {
  const playerId = useGlobalStore.getState().party[0];
  return scene.getObjectByName(`entity--${playerId}`) as Group;
}