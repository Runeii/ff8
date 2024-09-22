import { Vector3 } from "three";
import exits from "./exits";

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

export const getInitialEntrance = (initialField: keyof typeof exits) => {
  const entrance = exits[initialField]?.entrances?.[0]?.destinationPoint ?? { x: 0, y: 0, z: 0 };

  return vectorToFloatingPoint(entrance);
}