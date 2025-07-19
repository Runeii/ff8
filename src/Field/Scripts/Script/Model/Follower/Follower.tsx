import { ReactNode, useRef } from "react";
import useGlobalStore from "../../../../../store";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import { ScriptStateStore } from "../../state";
import createMovementController from "../../MovementController/MovementController";
import createRotationController from "../../RotationController/RotationController";
import { createAnimationController } from "../../AnimationController/AnimationController";

type FollowerProps = {
  animationController: ReturnType<typeof createAnimationController>;
  children: ReactNode;
  movementController: ReturnType<typeof createMovementController>;
  rotationController: ReturnType<typeof createRotationController>;
  partyMemberId?: number;
  useScriptStateStore: ScriptStateStore
}

const DISTANCE = 20;
const Follower = ({ animationController, children, movementController, partyMemberId, rotationController}: FollowerProps) => {
  const offset = useGlobalStore(state => state.party.findIndex(id => id === partyMemberId));

  const groupRef = useRef<Group>(null);

  useFrame(() => {
    const {isPartyFollowing } = useGlobalStore.getState();
    if (!isPartyFollowing) {
      return;
    }
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
    if (speed === 0) {
      animationController.playIdleAnimation();
      return;
    }
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