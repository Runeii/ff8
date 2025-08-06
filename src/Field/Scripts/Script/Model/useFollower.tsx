import { useFrame } from "@react-three/fiber";
import useGlobalStore from "../../../../store";
import { createMovementController } from "../MovementController/MovementController";
import createRotationController from "../RotationController/RotationController";
import { getPartyMemberModelComponent } from "./modelUtils";
import { useState } from "react";
import { Vector3 } from "three";
import { createAnimationController } from "../AnimationController/AnimationController";

type UseFollowerProps = {
  animationController: ReturnType<typeof createAnimationController>;
  isActive: boolean;
  movementController: ReturnType<typeof createMovementController>;
  rotationController: ReturnType<typeof createRotationController>;
  partyMemberId?: number;
}

const DISTANCE = 35;
const useFollower = ({ animationController, isActive, movementController, partyMemberId, rotationController }: UseFollowerProps) => {
  const [currentPosition] = useState(new Vector3());
  const [targetPosition] = useState(new Vector3());
  useFrame(() => {
    if (!isActive || !movementController || !rotationController || partyMemberId === undefined) {
      return;
    }

    const { congaWaypointHistory, isPartyFollowing, party } = useGlobalStore.getState();
    if (!isPartyFollowing || !party.includes(partyMemberId)) {
      return;
    }

    const offset = party.findIndex(id => id === partyMemberId);
    const history = congaWaypointHistory.at(-1 * offset * DISTANCE - 1);

    if (!history) {
      return;
    }

    const { position, angle, speed } = history;

    const followerPosition = movementController.getPosition();
    currentPosition.set(followerPosition.x, followerPosition.y, followerPosition.z);
    targetPosition.set(position.x, position.y, position.z);

    if (speed === 0 || currentPosition.distanceTo(targetPosition) === 0) {
      animationController.playMovementAnimation('stand');
      return;
    }

    movementController.moveToPoint(position, {
      isAnimationEnabled: true,
      userControlledSpeed: speed
    });

    rotationController.turnToFaceAngle(angle, 0);
  });
}

export default useFollower;