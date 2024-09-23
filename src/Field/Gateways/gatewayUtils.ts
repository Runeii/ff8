import { Mesh, Raycaster, Vector3 } from "three";
import { FormattedGateway } from "./Gateways";

const raycaster = new Raycaster();
let direction = new Vector3()

export const checkForIntersection = (player: Mesh, gateway: FormattedGateway) => {
  const [lineStart, lineEnd] = gateway.sourceLine;
  direction.set(0, 0, 0);
  direction = direction.subVectors(lineEnd, lineStart).normalize();
  const length = lineStart.distanceTo(lineEnd);

  raycaster.set(lineStart, direction);
  raycaster.far = length;
  raycaster.near = 0;

  const intersects = raycaster.intersectObject(player, true);

  return intersects.length > 0
}