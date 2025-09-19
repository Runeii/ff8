import { Box3,  Object3D, Raycaster, Vector3 } from "three"

const box1 = new Box3();
const box2 = new Box3();
const raycaster = new Raycaster();

const DIRECTION_VECTOR = new Vector3();
const pos1 = new Vector3();
const pos2 = new Vector3();
const boxSize = new Vector3();

export const checkForIntersectingMeshes = (mesh1: Object3D, mesh2: Object3D) => {
  box1.setFromObject(mesh1, true);
  box2.setFromObject(mesh2, true);
  
  if (!box1.intersectsBox(box2)) {
    return false;
  }

  mesh1.getWorldPosition(pos1);
  mesh2.getWorldPosition(pos2);
  
  const direction = DIRECTION_VECTOR.subVectors(pos2, pos1).normalize();
  raycaster.set(pos1, direction);
  
  const intersects = raycaster.intersectObject(mesh2, false);
  
  if (intersects.length > 0) {
    const distance = intersects[0].distance;
    const mesh1Size = box1.getSize(boxSize);
    const maxDimension1 = Math.max(mesh1Size.x, mesh1Size.y, mesh1Size.z);

    // If the hit is within mesh1's bounds, they're intersecting
    return distance <= maxDimension1 / 2;
  }
  
  return false;
}