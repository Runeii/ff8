import { Camera, Object3D, Raycaster, Vector3 } from "three";
import { FieldData } from "./Field/Field";
import gateways from './gateways.ts';
import useGlobalStore from "./store.ts";

export const numberToFloatingPoint = (value: number) => value / 4096;

export const floatingPointToNumber = (value: number) => value * 4096;

export const vectorToFloatingPoint = (value: Vector3 | { x: number, y: number, z: number } | number[]) => {
  if (Array.isArray(value)) {
    return new Vector3(
      numberToFloatingPoint(value[0]),
      numberToFloatingPoint(value[1]),
      numberToFloatingPoint(value[2])
    );
  }
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
  const initialField = new URLSearchParams(window.location.search).get('field')

  return initialField;
}

export const getInitialEntrance = (initialField: FieldData) => {
  const entrances = gateways.filter(gateway => gateway.target === initialField.id);

  if (entrances.length === 0) {
    console.warn('No entrances found for this map... ');
    return new Vector3(0, 0, 0);
  }

  const entrance = entrances[0].destinationPoint;
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

  const targetTriangle = sortedIntersects[0];
  const targetTriangleId = parseInt(targetTriangle.object.name);
  const { lockedTriangles } = useGlobalStore.getState()

  if (lockedTriangles.includes(targetTriangleId)) {
    return null;
  }

  return sortedIntersects[0].point;
}

const intersectionRaycaster = new Raycaster();
export const checkForIntersections = (object: Object3D, target: Vector3, blockages: Object3D[], camera: Camera) => {
  const needlePosition = new Vector3();
  object.getWorldPosition(needlePosition);
  const direction = new Vector3().subVectors(target, needlePosition).normalize();
  intersectionRaycaster.set(needlePosition, direction);
  intersectionRaycaster.far = needlePosition.distanceTo(target);
  intersectionRaycaster.near = 0;
  intersectionRaycaster.camera = camera;
  const intersects = intersectionRaycaster.intersectObjects(blockages, true);
  console.log(intersects)
  return intersects.length === 0;
}


// These are the "final" versions
const toCameraMeshWorldPosition = new Vector3(0, 0, 0);
const toCameraCameraWorldPosition = new Vector3(0, 0, 0);
export const getDirectionToCamera = (entity: Object3D, camera: Camera, targetVector = new Vector3(0, 0, 0)) => {
  entity.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);

  entity.getWorldPosition(toCameraMeshWorldPosition);
  camera.getWorldPosition(toCameraCameraWorldPosition);

  targetVector
    .subVectors(toCameraCameraWorldPosition, toCameraMeshWorldPosition)
    .normalize();

  return targetVector;
}

const localRight = new Vector3(1, 0, 0);
export const getLocalViewportRight = (entity: Object3D, camera: Camera, targetVector = new Vector3(0, 0, 0)) => {
  const cameraRightWorld = localRight.clone().applyQuaternion(camera.quaternion); // Transform to world space
  const rightWorldPosition = entity.getWorldPosition(targetVector).add(cameraRightWorld);
  const rightLocalPosition = entity.worldToLocal(rightWorldPosition);

  return rightLocalPosition.normalize();
}

const localForward = new Vector3(0, 0, -1);
export const getLocalViewportForward = (entity: Object3D, camera: Camera, targetVector = new Vector3(0, 0, 0)) => {
  const cameraForwardWorld = localForward.clone().applyQuaternion(camera.quaternion);
  const forwardWorldPosition = entity.getWorldPosition(targetVector).add(cameraForwardWorld);
  const forwardLocalPosition = entity.worldToLocal(forwardWorldPosition);

  return forwardLocalPosition.normalize();
}

export const getLocalViewportTop = (entity: Object3D, camera: Camera, targetVector = new Vector3(0, 0, 0)) => {
  entity.getWorldPosition(targetVector);

  const meshNDC = targetVector.clone().project(camera);
  // Top direction remains unchanged
  const topCenterNDC = new Vector3(meshNDC.x, 1, meshNDC.z);
  const topCenterWorld = topCenterNDC.clone().unproject(camera);

  return topCenterWorld.sub(targetVector).normalize();
}

export const computeSignedAngleTo = (
  currentDirection: Vector3,
  targetDirection: Vector3,
  up: Vector3
) => {
  // Compute the unsigned angle between the two vectors
  const angle = currentDirection.angleTo(targetDirection);

  // Determine the sign of the angle using the cross product
  const cross = new Vector3().crossVectors(currentDirection, targetDirection);


  if (cross.length() < 0.2) {
    // Use dot product to determine angle directly
    const dot = currentDirection.dot(targetDirection);
    return dot > 0 ? 0 : Math.PI; // 0 for same direction, π for opposite
  }

  const sign = cross.dot(up) < 0 ? -1 : 1;

  // Return the signed angle
  return angle * sign;
}
