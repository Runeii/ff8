import { Camera, Vector3 } from "three";

export const numberToFloatingPoint = (value: number) => value / 4096;

const BLANK_VECTOR = new Vector3();
export const vectorToFloatingPoint = (value: Vector3 | { x: number, y: number, z: number }) => {
  const vector = BLANK_VECTOR.clone()
  vector.x = numberToFloatingPoint(value.x);
  vector.y = numberToFloatingPoint(value.y);
  vector.z = numberToFloatingPoint(value.z);

  return vector
}

export const inverseLerpSymmetric = (a: number, b: number, v: number) => {
  if (a === b) {
    return 0;
  }
  const t = (v - a) / (b - a);
  return 2 * t - 1;
}


type CameraDirections = {
  forwardVector: Vector3;
  upVector: Vector3;
  rightVector: Vector3;
};

export const getCameraDirections = (
  camera: Camera,
  forwardVector: Vector3 = new Vector3(),
  rightVector: Vector3 = new Vector3(),
  upVector: Vector3 = new Vector3()
): CameraDirections => {

  // Step 1: Get the forward direction in world space (mutates forwardVector)
  camera.getWorldDirection(forwardVector);

  // Step 2: Calculate the right vector (camera's right direction in world space)
  // Using cross product of forwardVector and camera.up
  rightVector.crossVectors(forwardVector, camera.up);

  // Step 3: Check for degenerate case where forwardVector and up might be aligned
  if (rightVector.lengthSq() < 1e-6) {
    // If the right vector is too small, we need to choose an arbitrary right vector
    rightVector.set(1, 0, 0); // Use the world X axis as a fallback
  }

  // Normalize the right vector
  rightVector.normalize();

  return {
    forwardVector,
    upVector: camera.up,
    rightVector
  };
}
