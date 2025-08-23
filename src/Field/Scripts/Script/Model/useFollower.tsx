import { useFrame } from "@react-three/fiber";
import useGlobalStore from "../../../../store";
import createMovementController from "../MovementController/MovementController";
import createRotationController from "../RotationController/RotationController";
import { useState } from "react";
import { Vector3 } from "three";
import { createAnimationController } from "../AnimationController/AnimationController";
import { getPartyMemberModelComponent, getPlayerEntity } from "./modelUtils";

type UseFollowerProps = {
  animationController: ReturnType<typeof createAnimationController>;
  isActive: boolean;
  movementController: ReturnType<typeof createMovementController>;
  rotationController: ReturnType<typeof createRotationController>;
  partyMemberId: number | undefined;
}

const DISTANCE = 35;
const useFollower = ({ animationController, isActive, movementController, partyMemberId, rotationController }: UseFollowerProps) => {
  const [currentPosition] = useState(new Vector3());
  const [targetPosition] = useState(new Vector3());
  useFrame(({scene}) => {
    if (!isActive || !movementController || !rotationController || partyMemberId === undefined) {
      return;
    }

    const { congaWaypointHistory, isPartyFollowing, party } = useGlobalStore.getState();
    if (!isPartyFollowing || !party.includes(partyMemberId)) {
      return;
    }

    const offset = party.findIndex(id => id === partyMemberId);
    const history = congaWaypointHistory.at(-1 * offset * DISTANCE - 1);
    if (!history && !movementController.hasBeenPlaced()) {
      const leaderEntity = getPlayerEntity(scene);
      const thisMemberEntity = getPartyMemberModelComponent(scene, offset);
      if (!leaderEntity || !thisMemberEntity) {
        return;
      }

      const leaderMovementController = leaderEntity.userData.movementController as ReturnType<typeof createMovementController>;
      const leaderRotationController = leaderEntity.userData.rotationController as ReturnType<typeof createRotationController>;
      const position = leaderMovementController.getPosition();
      movementController.setPosition(
        new Vector3(position.x, position.y, position.z).sub(
          leaderRotationController.getCurrentDirection().multiplyScalar(0.03 * offset)
        )
      );
      rotationController.turnToFaceAngle(leaderRotationController.getState().angle.get(), 0);

      return;
    }

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