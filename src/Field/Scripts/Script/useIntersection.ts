import { useFrame } from "@react-three/fiber";
import { RefObject, useRef, useState } from "react";
import { checkForIntersectingMeshes } from "../../Gateways/gatewayUtils";
import { Object3D, Vector3 } from "three";
import useGlobalStore from "../../../store";
import { getPlayerEntity } from "./Model/modelUtils";
import createMovementController from "./MovementController/MovementController";

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

const useIntersection = (targetMeshRef: RefObject<Object3D | null>, isActive = true, {
  onTouchOn,  
  onTouchOff,
  onAcross,
  onTouch,
}: {
  onTouchOn?: (entrySide: STATES) => void;
  onTouchOff?: (entrySide: STATES) => void;
  onAcross?: () => void;
  onTouch?: () => void;
}, line: VectorLike[]) => {
  const currentStateRef = useRef<STATES>(undefined);
  const hasEverExitedRef = useRef(false);

  const [playerPosition] = useState(new Vector3());

  const isUserControllable = useGlobalStore(state => state.isUserControllable)

  useFrame(({ scene }) => {
    if (!targetMeshRef.current || !isActive || !isUserControllable) {
      return;
    }

    const targetMesh = targetMeshRef.current;

    const player = getPlayerEntity(scene);
    if (!player) {
      return;
    }


    const movementController = (player.userData.movementController as ReturnType<typeof createMovementController>);
    const hasBeenPlaced = movementController.getState().hasBeenPlaced;
    const hasMoved = movementController.getState().hasMoved;

    if (!hasBeenPlaced || !hasMoved) {
      return;
    }

    const hitbox = player.getObjectByName("hitbox") as Object3D | null;
    if (!hitbox) {
      console.warn("Hitbox not found on player entity.");
      return;
    }

    const isIntersecting = checkForIntersectingMeshes(hitbox, targetMesh);

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