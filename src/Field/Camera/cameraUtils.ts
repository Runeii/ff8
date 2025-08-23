import { Camera, Quaternion, Vector3 } from "three";
import { FieldData } from "../Field";
import { radToDeg } from "three/src/math/MathUtils.js";

const FF8_PERSPECTIVE_DIVISOR = 256;

export const calculateFOV = (cameraZoom: number, screenHeight: number): number => {
  const perspectiveStrength = cameraZoom / FF8_PERSPECTIVE_DIVISOR;
  
  const fovRadians = 2 * Math.atan(screenHeight / (2.0 * perspectiveStrength * FF8_PERSPECTIVE_DIVISOR));
  
  return radToDeg(fovRadians);
};


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
  return (angle * depth) / FF8_PERSPECTIVE_DIVISOR;
}

export const calculateAngleForParallax = (pan: number, depth: number): number => {
  return (pan * FF8_PERSPECTIVE_DIVISOR) / depth;
}

export const getCameraDirections = (camera: Camera) => {
  camera.updateMatrixWorld();
  
  const forwardVector = new Vector3();
  camera.getWorldDirection(forwardVector);
  const rightVector = new Vector3().crossVectors(camera.up, forwardVector).normalize().negate(); // X-axis in camera space
  const upVector = new Vector3().crossVectors(forwardVector, rightVector).normalize().negate(); // Y-axis in camera space

  return {
    rightVector,
    upVector,
    forwardVector
  };
};

export const getReliableRotationAxes = (camera: Camera) => {
  const forward = new Vector3();
  camera.getWorldDirection(forward);

  const right = new Vector3().crossVectors(forward, camera.up).normalize();

  const yawAxis = camera.up.clone().normalize();
  const pitchAxis = right;

  return { yawAxis, pitchAxis };
};

export const getBoundaries = (limits: FieldData['limits']) => ({
  left: (limits.cameraRange.left + limits.screenRange.right / 2) / FF8_PERSPECTIVE_DIVISOR,
  right: (limits.cameraRange.right - limits.screenRange.right / 2) / FF8_PERSPECTIVE_DIVISOR,
  top: (limits.cameraRange.top + limits.screenRange.bottom / 2) / FF8_PERSPECTIVE_DIVISOR,
  bottom: (limits.cameraRange.bottom - limits.screenRange.bottom / 2) / FF8_PERSPECTIVE_DIVISOR,
})
