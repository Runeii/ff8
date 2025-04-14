import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { checkForIntersection } from "../../Gateways/gatewayUtils";
import { Object3D, Vector3 } from "three";
import useGlobalStore from "../../../store";

type STATES = 'LEFT' | 'INTERSECTING' | 'RIGHT';

const getPointSideOfLine = (lineStart: Vector3, lineEnd: Vector3, point: Vector3): STATES => {
  const lineDirection = new Vector3().subVectors(lineEnd, lineStart);
  const pointVector = new Vector3().subVectors(point, lineStart);
  const cross = new Vector3().crossVectors(lineDirection, pointVector);

  // Check the sign of z component
  if (cross.z > 0) {
    return "LEFT";
  } else if (cross.z < 0) {
    return "RIGHT";
  } else {
    return "INTERSECTING";
  }
}

const useLineIntersection = (points: Vector3[] | undefined, isActive = true, {
  onTouchOn,  
  onTouchOff,
  onAcross,
  onTouch,
}: {
  onTouchOn?: () => void;
  onTouchOff?: () => void;
  onAcross?: () => void;
  onTouch?: () => void;
}, id?: number) => {
  const hasMoved = useGlobalStore(state => state.hasMoved);

  const lastSideRef = useRef<STATES>();
  const currentStateRef = useRef<STATES>();

  useFrame(({ scene }) => {
    if (!hasMoved) {
      return;
    }

    const mesh = scene.getObjectByName("hitbox") as Object3D;

    if (!mesh || !points || !isActive) {
      return false;
    }

    const isIntersecting = checkForIntersection(mesh, points);

    if (isIntersecting && currentStateRef.current !== "INTERSECTING") {
      onTouchOn?.();
      if (id === 6) {
        console.log('on touch on')
      }
    }

    if (isIntersecting) {
      currentStateRef.current = "INTERSECTING";
      onTouch?.();
      if (id === 6) {
        console.log('on touch')
      }
      return;
    }

    if (currentStateRef.current === 'INTERSECTING') {
      if (id === 6) {
        console.log('on touch off')
      }
      onTouchOff?.();
    }

    const meshPosition = new Vector3();
    mesh.getWorldPosition(meshPosition);
    const currentSide = getPointSideOfLine(points[0], points[1], meshPosition);

    if (lastSideRef.current && currentSide !== lastSideRef.current) {
      onAcross?.();
      if (id === 6) {
        console.log('on touch across')
      }
    }

    lastSideRef.current = currentSide;
    currentStateRef.current = currentSide;
  });
}

export default useLineIntersection;