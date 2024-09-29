import { Camera, Quaternion, Vector3 } from "three";
import { WORLD_DIRECTIONS } from "../../utils";
import { FieldData } from "../Field";

export const getRotationAngleAroundAxis = (initialRotation: Quaternion, currentRotation: Quaternion, axis: Vector3) => {
  // Ensure the axis is normalized
  axis = axis.clone().normalize();

  // Calculate the relative rotation quaternion
  const qRelative = currentRotation.clone().multiply(initialRotation.clone().invert());

  // Choose a vector orthogonal to the axis
  const tempVector = new Vector3(1, 0, 0);
  if (Math.abs(axis.dot(tempVector)) > 0.99) {
    tempVector.set(0, 1, 0);
  }
  const orthogonalVector = new Vector3().crossVectors(axis, tempVector).normalize();

  // Rotate the orthogonal vector using the relative quaternion
  const vInitial = orthogonalVector.clone();
  const vRotated = orthogonalVector.clone().applyQuaternion(qRelative);

  // Project both vectors onto the plane perpendicular to the axis
  const vInitialProj = vInitial.clone().sub(axis.clone().multiplyScalar(vInitial.dot(axis))).normalize();
  const vRotatedProj = vRotated.clone().sub(axis.clone().multiplyScalar(vRotated.dot(axis))).normalize();

  // Compute the angle between the projected vectors
  const angle = Math.atan2(
    new Vector3().crossVectors(vInitialProj, vRotatedProj).dot(axis),
    vInitialProj.dot(vRotatedProj)
  );

  return angle; // Angle in radians
}


export const calculateParallax = (angle: number, depth: number): number => {
  // Ensure depth is valid
  if (depth <= 0) {
    throw new Error("Depth must be greater than zero.");
  }

  // Calculate the factor by which the parallax reduces the effect based on depth
  const parallaxFactor = 1 - (1 / depth);

  // Calculate parallax displacement based on rotation angle
  return Math.sin(angle) * parallaxFactor * depth;
}

export const calculateAngleForParallax = (pan: number, depth: number): number => {
  // Ensure depth is greater than one
  if (depth <= 1) {
    throw new Error("Depth must be greater than one.");
  }

  // Calculate the parallax factor
  const parallaxFactor = 1 - (1 / depth);

  // Calculate the denominator
  const denominator = parallaxFactor * depth;

  // Calculate the sine of the angle
  const sinAngle = pan / denominator;

  // Validate the sine value
  if (sinAngle < -1 || sinAngle > 1) {
    throw new Error("Invalid pan level for the given depth. The sin(angle) must be between -1 and 1.");
  }

  // Calculate and return the angle in radians
  return Math.asin(sinAngle) * 0.92; /// 0.92 is a magic number to adjust the angle
}

export const getCameraDirections = (camera: Camera) => {
  // Ensure the camera's matrixWorld is up to date
  camera.updateMatrixWorld();

  // Create local axes vectors
  // Transform the local axes to world space
  const rightVector = WORLD_DIRECTIONS.RIGHT.clone().applyMatrix4(camera.matrixWorld).sub(camera.position).normalize();
  const upVector = WORLD_DIRECTIONS.UP.clone().applyMatrix4(camera.matrixWorld).sub(camera.position).normalize();
  const forwardVector = WORLD_DIRECTIONS.FORWARD.clone().applyMatrix4(camera.matrixWorld).sub(camera.position).normalize();

  return {
    rightVector,
    upVector,
    forwardVector
  };
};


export const getBoundaries = (limits: FieldData['limits']) => ({
  left: limits.cameraRange.left + limits.screenRange.right / 2,
  right: limits.cameraRange.right - limits.screenRange.right / 2,
  top: limits.cameraRange.top + limits.screenRange.bottom / 2,
  bottom: limits.cameraRange.bottom - limits.screenRange.bottom / 2,
})