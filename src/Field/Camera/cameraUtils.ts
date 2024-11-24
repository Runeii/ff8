import { Camera, Quaternion, Vector3 } from "three";
import { FieldData } from "../Field";
import { WORLD_DIRECTIONS } from "../../utils";

export const getRotationAngleAroundAxis = (initialRotation: Quaternion, currentRotation: Quaternion, axis: Vector3) => {
  // Normalize the axis
  axis = axis.clone().normalize();

  // Calculate the relative rotation quaternion
  const qRelative = currentRotation.clone().multiply(initialRotation.clone().invert());

  // Choose a robust orthogonal vector to the axis
  const orthogonalVector = getSmoothOrthogonalVector(axis);

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

  return angle;
};

const getSmoothOrthogonalVector = (axis: Vector3): Vector3 => {
  // Normalize the input axis to ensure consistent calculations
  axis = axis.clone().normalize();

  // Generate a guaranteed non-collinear vector
  const arbitrary = Math.abs(axis.x) > Math.abs(axis.z)
    ? new Vector3(-axis.y, axis.x, 0) // Perturb X and Y
    : new Vector3(0, -axis.z, axis.y); // Perturb Y and Z

  // Compute the orthogonal vector using the cross product
  const orthogonal = new Vector3().crossVectors(axis, arbitrary).normalize();

  return orthogonal;
};

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
  return Math.asin(sinAngle);
  //return Math.asin(sinAngle) * 0.92; /// 0.92 is a magic number to adjust the angle
}

const forwardVector = new Vector3();
export const getCameraDirections = (camera: Camera) => {
  // Ensure the camera's matrixWorld is up to date
  camera.updateMatrixWorld();

  camera.getWorldDirection(forwardVector);
  const rightVector = new Vector3().crossVectors(camera.up, forwardVector).normalize().negate(); // X-axis in camera space
  const upVector = new Vector3().crossVectors(forwardVector, rightVector).normalize().negate(); // Y-axis in camera space

  return {
    rightVector,
    upVector,
    forwardVector
  };
};

export const getCharacterForwardDirection = (camera: Camera) => {
  const { forwardVector, upVector } = getCameraDirections(camera);

  if (Math.abs(forwardVector.z) < 0.9) {
    return {
      forwardVector,
      upVector
    }
  }

  return {
    upVector: forwardVector,
    forwardVector: upVector
  };
}

export const getReliableRotationAxes = (camera: Camera) => {
  const forward = new Vector3();
  camera.getWorldDirection(forward);

  const right = new Vector3().crossVectors(forward, camera.up).normalize();

  const yawAxis = camera.up.clone().normalize();
  const pitchAxis = right;

  return { yawAxis, pitchAxis };
};

export const getBoundaries = (limits: FieldData['limits']) => ({
  left: limits.cameraRange.left + limits.screenRange.right / 2,
  right: limits.cameraRange.right - limits.screenRange.right / 2,
  top: limits.cameraRange.top + limits.screenRange.bottom / 2,
  bottom: limits.cameraRange.bottom - limits.screenRange.bottom / 2,
})
