import { ReactNode, useRef } from "react";
import useGlobalStore from "../../../../../store";
import { useFrame, useThree } from "@react-three/fiber";
import { Group, Vector3 } from "three";
import { ScriptStateStore } from "../../state";
import createMovementController from "../../MovementController/MovementController";
import { getPartyMemberModelComponent } from "../modelUtils";
import createRotationController from "../../RotationController/RotationController";

type FollowerProps = {
  children: ReactNode;
  movementController: ReturnType<typeof createMovementController>;
  rotationController: ReturnType<typeof createRotationController>;
  partyMemberId?: number;
  useScriptStateStore: ScriptStateStore
}

const DISTANCE = 20;
const DISTANCE_VECTOR = new Vector3(0, 0, 0);
const Follower = ({ children, movementController, partyMemberId, rotationController}: FollowerProps) => {
  const offset = useGlobalStore(state => state.party.findIndex(id => id === partyMemberId));

  const groupRef = useRef<Group>(null);
  const currentMovementSpeedRef = useRef(0);

  useFrame(() => {
    const { congaWaypointHistory } = useGlobalStore.getState();
    const isFirstHistoryItem = congaWaypointHistory.length === 1;
    const history = congaWaypointHistory.at(-1 * offset * DISTANCE - 1);

    if (!groupRef.current) {
      return;
    }

    if (!history) {
      groupRef.current.visible = false;
      return;
    }
    
    const { position, angle, speed } = history;
    
    movementController.setMovementSpeed(speed);
    currentMovementSpeedRef.current = speed;
    movementController.moveToPoint(position, {
      duration: isFirstHistoryItem ? 0 : 32,
      isFacingTarget: false,
    });
    groupRef.current.visible = true;
    rotationController.turnToFaceAngle(angle, 0);
  });

  return <group ref={groupRef} visible={false}>{children}</group>;
}

export default Follower;