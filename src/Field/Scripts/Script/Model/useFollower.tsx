import { useFrame } from "@react-three/fiber";
import useGlobalStore from "../../../../store";
import createMovementController from "../MovementController/MovementController";
import createRotationController from "../RotationController/RotationController";
import { useCallback, useRef, useState } from "react";
import { Scene, Vector3 } from "three";
import { createAnimationController } from "../AnimationController/AnimationController";
import { getPartyMemberModelComponent, getPlayerEntity } from "./modelUtils";

type UseFollowerProps = {
  animationController: ReturnType<typeof createAnimationController>;
  isActive: boolean;
  movementController: ReturnType<typeof createMovementController>;
  rotationController: ReturnType<typeof createRotationController>;
  partyMemberId: number | undefined;
}

const DISTANCE = 20;
const useFollower = ({ animationController, isActive, movementController, partyMemberId, rotationController }: UseFollowerProps) => {
  const [currentPosition] = useState(new Vector3());
  const [targetPosition] = useState(new Vector3());

  const needsCleanUpRef = useRef(false);
  const isMovingToWaypointRef = useRef(false);
  const moveToWaypoint = useCallback(async (scene: Scene) => {
    if (!isActive || !movementController || !rotationController) {
      return;
    }

    const { congaWaypointHistory, party, isUserControllable } = useGlobalStore.getState();
    
    if (!isUserControllable) {
      if (congaWaypointHistory.length > 0) {
        useGlobalStore.setState({
          congaWaypointHistory: []
        })
      }
      if (needsCleanUpRef.current) {
        animationController.playMovementAnimation('standing');
        needsCleanUpRef.current = false;
      }
      return;
    }

    const offset = party.findIndex(id => id === partyMemberId);
    const history = congaWaypointHistory.at(-1 * offset * DISTANCE - 1);
    if (!history && !movementController.getState().hasBeenPlaced) {
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
      animationController.playMovementAnimation('standing');
      rotationController.turnToFaceAngle(leaderRotationController.getState().angle.get(), 0);
      
      return;
    }
    
    if (!history) {
      return;
    }
    needsCleanUpRef.current = true;
    const { position, angle, speed, isClimbingLadder } = history;
    
    const followerPosition = movementController.getPosition();
    currentPosition.set(followerPosition.x, followerPosition.y, followerPosition.z);
    targetPosition.set(position.x, position.y, position.z);

    const isCurrentlyStanding = animationController.getSavedAnimation().standingId === animationController.getState().activeAnimation?.clipId;
    const isCurrentlyWalking = animationController.getSavedAnimation().walkingId === animationController.getState().activeAnimation?.clipId;
    const isCurrentlyRunning = animationController.getSavedAnimation().runningId === animationController.getState().activeAnimation?.clipId;

    if (currentPosition.distanceTo(targetPosition) === 0 && !isClimbingLadder) {
      const leaderEntity = getPlayerEntity(scene);
      if (!leaderEntity) {
        return;
      }
      
      const leaderAnimationController = leaderEntity.userData.animationController as ReturnType<typeof createAnimationController>;
      const isLeaderCurrentlyStanding = leaderAnimationController.getSavedAnimation().standingId === leaderAnimationController.getState().activeAnimation?.clipId;

      if (isLeaderCurrentlyStanding && !isCurrentlyStanding) {
        animationController.playMovementAnimation('standing');
      }
      return;
    }

    rotationController.turnToFaceAngle(angle, 0);
    if (isClimbingLadder) {
      animationController.playLadderAnimation();
    } else if (speed === 0 && !isCurrentlyStanding) {
      animationController.playMovementAnimation('standing');
    } else if (speed > 4000 && !isCurrentlyRunning) {
      animationController.playMovementAnimation('running');
    } else if (speed <= 4000 && !isCurrentlyWalking) {
      animationController.playMovementAnimation('walking');
    }

    await movementController.moveToPoint(position, {
      isAnimationEnabled: false,
      isFacingTarget: false,
      isClimbingLadder,
      isAllowedToLeaveWalkmesh: true,
      isAllowedToCrossBlockedTriangles: true,
      userControlledSpeed: speed
    });
  }, [animationController, currentPosition, isActive, movementController, partyMemberId, rotationController, targetPosition]);

  useFrame((state) => {
    if (isMovingToWaypointRef.current) {
      return;
    }
    isMovingToWaypointRef.current = true;
    moveToWaypoint(state.scene).then(() => {
      isMovingToWaypointRef.current = false;
    });
  });
}

export default useFollower;