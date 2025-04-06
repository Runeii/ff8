import { ReactNode, useMemo, useRef } from "react";
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

const DISTANCE = 10;
const DISTANCE_VECTOR = new Vector3(0, 0, 0);
const Follower = ({ children, movementController, partyMemberId, rotationController}: FollowerProps) => {
  const offset = useGlobalStore(state => state.party.findIndex(id => id === partyMemberId));
  const isLastPartyMember = useGlobalStore(state => state.party.length - 1 === offset);

  const scene = useThree(state => state.scene);
  const leaderMovementController = useMemo(() => {
    const member1 = getPartyMemberModelComponent(scene, 0)
    if (!member1) {
      return null;
    }
    return member1.userData.movementController as ReturnType<typeof createMovementController>
  }, [scene]);

  
  const groupRef = useRef<Group>(null);
  useFrame(() => {
    const { congaWaypointHistory } = useGlobalStore.getState();
    const isFirstHistoryItem = congaWaypointHistory.length === 1;
    const history = congaWaypointHistory[offset * DISTANCE - 1];

    if (!groupRef.current || !history || !leaderMovementController) {
      return;
    }
    
    const leaderSpeed = leaderMovementController.getState().movementSpeed;

    const { position, angle } = history;
  
    const currentPosition = movementController.getState().position.get();
    const distance = position.distanceTo(DISTANCE_VECTOR.set(currentPosition[0], currentPosition[1], currentPosition[2]));
    if (distance < 0.004) {
      return;
    }
    movementController.setMovementSpeed(leaderSpeed);
    movementController.moveToPoint(position, {
      duration: isFirstHistoryItem ? 0 : 16,
      isFacingTarget: false,
    });
    groupRef.current.visible = true;
    rotationController.turnToFaceAngle(angle, 0);

    if (isLastPartyMember) {
      useGlobalStore.setState(state => ({
        ...state,
        congaWaypointHistory: state.congaWaypointHistory.slice(0, DISTANCE * 2)
      }))
    }
  });

  return <group ref={groupRef} visible={false}>{children}</group>;
}

export default Follower;