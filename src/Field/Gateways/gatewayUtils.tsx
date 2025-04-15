import { Box3,  Object3D, Raycaster, Vector3 } from "three"

const raycaster = new Raycaster();
let direction = new Vector3()

const box1 = new Box3();
const box2 = new Box3();
// Utility to actually check for box intersection
export const doBoxesIntersect = (box1, box2) => {
  // Explicit test to verify Three.js's intersectsBox method
  return (
    box1.max.x > box2.min.x && 
    box1.min.x < box2.max.x && 
    box1.max.y > box2.min.y && 
    box1.min.y < box2.max.y && 
    box1.max.z > box2.min.z && 
    box1.min.z < box2.max.z
  );
};

export const checkForIntersectingMeshes = (mesh1: Object3D, mesh2: Object3D) => {
  box1.setFromObject(mesh1, true);
  box2.setFromObject(mesh2, true);
  const intersects = box1.intersectsBox(box2);
  return intersects;
}