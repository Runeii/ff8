import { Euler, Matrix4, Quaternion, Vector3 } from "three";

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


export const calculateTotalRotationInDirection = (
  initialRotation: Euler,
  currentRotation: Euler,
  direction: Vector3,
  referenceAxis: Vector3
): number => {
  const initialMatrix = new Matrix4().makeRotationFromEuler(initialRotation);
  const currentMatrix = new Matrix4().makeRotationFromEuler(currentRotation);

  const totalRotationMatrix = currentMatrix.multiply(initialMatrix.clone().invert());

  const transformedDirection = direction.clone().applyMatrix4(totalRotationMatrix);

  const projectedOriginal = direction.clone().projectOnPlane(referenceAxis).normalize();
  const projectedTransformed = transformedDirection.clone().projectOnPlane(referenceAxis).normalize();

  const angle = projectedOriginal.angleTo(projectedTransformed);

  const crossProduct = new Vector3().crossVectors(projectedOriginal, projectedTransformed);

  const sign = Math.sign(crossProduct.dot(referenceAxis));

  return angle * sign;
};

export const rotateTowardsInDirection = (
  currentRotation: Euler,
  desiredRotation: Euler,
  direction: Vector3
): Euler => {
  const currentQuaternion = new Quaternion().setFromEuler(currentRotation);
  const desiredQuaternion = new Quaternion().setFromEuler(desiredRotation);

  const currentMatrix = new Matrix4().makeRotationFromQuaternion(currentQuaternion);
  const desiredMatrix = new Matrix4().makeRotationFromQuaternion(desiredQuaternion);

  // Find the rotation between the current and desired rotations
  const totalRotationMatrix = desiredMatrix.multiply(currentMatrix.clone().invert());

  // Extract the rotation along the given direction vector
  const transformedDirection = direction.clone().applyMatrix4(totalRotationMatrix);
  const angle = direction.angleTo(transformedDirection);

  // Create the quaternion for the rotation in the desired direction
  const axis = new Vector3().crossVectors(direction, transformedDirection).normalize();
  const limitedRotationQuaternion = new Quaternion().setFromAxisAngle(axis, angle);

  // Apply the rotation to the current quaternion
  currentQuaternion.multiply(limitedRotationQuaternion);

  // Convert back to Euler angles and return the result
  const resultingRotation = new Euler().setFromQuaternion(currentQuaternion);

  return resultingRotation;
};
