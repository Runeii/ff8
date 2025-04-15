import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import { checkForIntersectingMeshes } from "../../Gateways/gatewayUtils";
import { Object3D, Vector3 } from "three";
import useGlobalStore from "../../../store";

export type STATES = 'LEFT' | 'INTERSECTING' | 'RIGHT' | undefined;

const getPointSideOfLine = (lineStart: VectorLike, lineEnd: VectorLike, point: Vector3): STATES => {
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

const useIntersection = (targetMesh: Object3D | null, isActive = true, {
  onTouchOn,  
  onTouchOff,
  onAcross,
  onTouch,
}: {
  onTouchOn?: (entrySide: STATES) => void;
  onTouchOff?: (entrySide: STATES) => void;
  onAcross?: () => void;
  onTouch?: () => void;
}, line: VectorLike[], id?: number) => {
  const hasMoved = useGlobalStore(state => state.hasMoved);

  const currentStateRef = useRef<STATES>();
  const hasEverExitedRef = useRef(false);

  const [playerPosition] = useState(new Vector3());

  useFrame(({ scene }) => {
    if (!hasMoved || !targetMesh) {
      return;
    }

    const player = scene.getObjectByName("hitbox") as Object3D;

    if (!player || !isActive) {
      return false;
    }

    const isIntersecting = checkForIntersectingMeshes(player, targetMesh);

    if (isIntersecting && !hasEverExitedRef.current) {
      return;
    }

    if (!isIntersecting) {
      hasEverExitedRef.current = true;
    }

    if (isIntersecting && currentStateRef.current !== "INTERSECTING") {
      onTouchOn?.(currentStateRef.current);
    }

    if (isIntersecting) {
      currentStateRef.current = "INTERSECTING";
      onTouch?.();
      return;
    }
    player.getWorldPosition(playerPosition);
    const side = getPointSideOfLine(line[0], line[1], playerPosition);

    if (currentStateRef.current === 'INTERSECTING') {
      onTouchOff?.(side);
      onAcross?.();
    }

    currentStateRef.current = side;
  });
}

export default useIntersection;