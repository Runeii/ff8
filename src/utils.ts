import { Mesh, Object3D, Raycaster, Scene, Vector3 } from "three";
import { FieldData } from "./Field/Field";
import gateways from './gateways.ts';
import useGlobalStore from "./store.ts";

export const numberToFloatingPoint = (value: number) => value / 4096;

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
  const initialField = new URLSearchParams(window.location.search).get('field') || 'WORLD_MAP'

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

export const getPartyMemberEntity = (scene: Scene, partyMemberId: number) => {
  return scene.getObjectByName(`party--${partyMemberId}`) as Mesh;
}