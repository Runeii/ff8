import { Vector3 } from "three";
import { clamp } from "three/src/math/MathUtils.js";

export const getShortestRouteToAngle = (targetAngle: number, currentAngle: number) => {
  const angleDifference = Math.abs(currentAngle - targetAngle);

  // Calculate shortest route
  if (angleDifference <= 128) {
    return targetAngle;
  }

  if (currentAngle >= targetAngle) {
    return targetAngle + 256;
  } else {
    return targetAngle - 256;
  }
}

export const getDirectionToVector = (target: Vector3, currentPosition: VectorLike) => {
  const targetDirection = target.clone().sub(currentPosition).normalize();
  return targetDirection;
}

const projectVectorOntoPlane = (vector: Vector3, planeNormal: Vector3) => {
  const normalizedPlaneNormal = planeNormal.clone().normalize();
  const dot = vector.dot(normalizedPlaneNormal);

  return vector.clone().sub(normalizedPlaneNormal.multiplyScalar(dot));
}

export const signedAngleBetweenVectors = (v1: Vector3, v2: Vector3, axis: Vector3) =>{
  const v1OnPlane = projectVectorOntoPlane(v1.clone().normalize(), axis);
  const v2OnPlane = projectVectorOntoPlane(v2.clone().normalize(), axis);
  
  if (v1OnPlane.lengthSq() < 0.001 || v2OnPlane.lengthSq() < 0.001) {
    return 0;
  }
  
  v1OnPlane.normalize();
  v2OnPlane.normalize();

  const angle = Math.acos(clamp(v1OnPlane.dot(v2OnPlane), -1, 1));
  
  // Determine the sign of the angle
  const cross = new Vector3().crossVectors(v1OnPlane, v2OnPlane);
  const sign = Math.sign(cross.dot(axis));
  
  return angle * sign;
}

export const unitToRadians = (unit: number) => {
  const normalizedValue = unit % 256;
  const radians = (normalizedValue * Math.PI * 2) / 256;
  return radians;
}

export const radiansToUnit = (radians: number) => {
  const normalizedValue = (radians * 256) / (Math.PI * 2);
  return Math.floor(normalizedValue) % 256;
}