import { Box3, Mesh, Raycaster, Vector3 } from "three"

const raycaster = new Raycaster();
let direction = new Vector3()

export const checkForIntersection = (player: Mesh, points: Vector3[]) => {
  const [lineStart, lineEnd] = points;

  direction.set(0, 0, 0);
  direction = direction.subVectors(lineEnd, lineStart).normalize();
  const length = lineStart.distanceTo(lineEnd);

  raycaster.set(lineStart, direction);
  raycaster.far = length;
  raycaster.near = 0;

  const intersects = raycaster.intersectObject(player, true);

  return intersects.length > 0
}

export const checkForIntersectingMeshes = (mesh1: Mesh, mesh2: Mesh) => {
  const box1 = new Box3().setFromObject(mesh1);
  const box2 = new Box3().setFromObject(mesh2);
  const intersects = box1.intersectsBox(box2);
  return intersects;
}