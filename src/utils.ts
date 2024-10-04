import { Object3D, Raycaster, Vector3 } from "three";
import { FieldData } from "./Field/Field";
import { CHARACTER_HEIGHT } from "./Character/Character";
import gateways from './gateways.ts';

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

const RANDOM_STARTS = [
  'titown6',
  'dotown_2a',
  'bggate_1',
]

export const getInitialField = () => {
  const initialField = new URLSearchParams(window.location.search).get('field') || RANDOM_STARTS[Math.floor(Math.random() * RANDOM_STARTS.length)];

  return initialField;
}

export const getInitialEntrance = (initialField: FieldData) => {
  const { exits, entrances } = gateways[(initialField.id as keyof typeof gateways)];

  if (entrances.length === 0 && exits.length === 0) {
    console.warn('No entrances or exits found for this map... ');
    return new Vector3(0, 0, 0);
  }

  if (entrances.length > 0) {
    const entrance = entrances[0]!.destinationPoint;
    console.log(entrance)
    return vectorToFloatingPoint(entrance);
  }

  const exit = exits[0]!.sourceLine.map((point) => vectorToFloatingPoint(point));
  const midpoint = new Vector3().addVectors(exit[0], exit[1]).divideScalar(2);
  midpoint.z += CHARACTER_HEIGHT / 2
  return midpoint;
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