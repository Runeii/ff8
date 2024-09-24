import { Object3D, Raycaster, Vector3 } from "three";
import { FieldData } from "./Field/Field";
import { CHARACTER_HEIGHT } from "./Character/Character";

export const numberToFloatingPoint = (value: number) => value / 4096;

export const vectorToFloatingPoint = (value: Vector3 | { x: number, y: number, z: number }) => {
  const vector = new Vector3();
  vector.x = numberToFloatingPoint(value.x);
  vector.y = numberToFloatingPoint(value.y);
  vector.z = numberToFloatingPoint(value.z);

  return vector
}

export const WORLD_DIRECTIONS = {
  FORWARD: new Vector3(0, 0, -1),
  RIGHT: new Vector3(1, 0, 0),
  UP: new Vector3(0, 1, 0),
}

export const getInitialField = () => {
  const initialField = new URLSearchParams(window.location.search).get('field') || 'bghall_5';

  return initialField;
}

export const getInitialEntrance = (initialField: FieldData) => {
  const exits = initialField.gateways.filter((gateway) => gateway.id.startsWith('exit'));

  if (exits.length > 0) {
    const exit = exits[0].sourceLine.map((point) => vectorToFloatingPoint(point));
    const midpoint = new Vector3().addVectors(exit[0], exit[1]).divideScalar(2);
    midpoint.z += CHARACTER_HEIGHT / 2
    return midpoint;
  }

  const entrance = initialField.gateways[0].destinationPoint;

  return vectorToFloatingPoint(entrance);
}


const raycaster = new Raycaster();
export const getPositionOnWalkmesh = (desiredPosition: Vector3, walkmesh: Object3D, maxDistance?: number) => {
  let intersects = [];
  raycaster.set(desiredPosition, new Vector3(0, 0, -1));
  intersects.push(raycaster.intersectObject(walkmesh, true));

  raycaster.set(desiredPosition, new Vector3(0, 0, 1));
  intersects.push(raycaster.intersectObject(walkmesh, true));

  intersects = intersects.flat()

  if (maxDistance) {
    intersects = intersects.filter((intersect) => intersect.distance < maxDistance);
  }

  if (intersects.length === 0) {
    return null;
  }

  const sortedIntersects = intersects.sort((a, b) => {
    return a.distance - b.distance;
  });


  return sortedIntersects[0].point;
}