import { Group, Mesh, Scene } from "three";

export const getScriptEntity = (scene: Scene, scriptGroupId: number) => {
  return scene.getObjectByName(`entity--${scriptGroupId}`) as Group;
}

export const getPartyMemberModelComponent = (scene: Scene, partyMemberId: number) => {
  return scene.getObjectByName(`party--${partyMemberId}`) as Mesh;
}
