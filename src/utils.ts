import { Vector3 } from "three";

export const numberToFloatingPoint = (value: number) => value / 4096;

const BLANK_VECTOR = new Vector3();
export const vectorToFloatingPoint = (value: Vector3 | { x: number, y: number, z: number }) => {
  const vector = BLANK_VECTOR.clone()
  vector.x = numberToFloatingPoint(value.x);
  vector.y = numberToFloatingPoint(value.y);
  vector.z = numberToFloatingPoint(value.z);

  return vector
}