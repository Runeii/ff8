import { useFrame } from "@react-three/fiber";
import useGlobalStore from "../../../../store";
import createMovementController from "../MovementController/MovementController";
import createRotationController from "../RotationController/RotationController";
import { useCallback } from "react";
import { Scene, Vector3 } from "three";
import { getPartyMemberModelComponent, getPlayerEntity } from "./modelUtils";

type UseFollowerProps = {
  isActive: boolean;
  movementController: ReturnType<typeof createMovementController>;
  rotationController: ReturnType<typeof createRotationController>;
  partyMemberId: number | undefined;
}

const DISTANCE = 30;
const useFollower = ({ isActive, movementController, partyMemberId, rotationController }: UseFollowerProps) => {
  const moveToWaypoint = useCallback((scene: Scene) => {
    if (!isActive || !movementController || !rotationController) {
      return;
    }

    const { congaWaypointHistory, party, isUserControllable } = useGlobalStore.getState();
    
    const offset = party.findIndex(id => id === partyMemberId);
    const history = congaWaypointHistory.at(-1 * offset * DISTANCE - 1);

    if (!isUserControllable) {
      console.log('Resetting conga history');
      if (congaWaypointHistory.length > 0) {
        useGlobalStore.setState({
          congaWaypointHistory: []
        })
      }
      return;
    }

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

      rotationController.turnToFaceAngle(leaderRotationController.getState().angle.get(), 0);
      
      return;
    }
    
    if (!history) {
      return;
    }

    const { isClimbingLadder, position, speed, angle } = history;
    console.log(history)
    if (position.equals(movementController.getPosition()) && angle === rotationController.getState().angle.get()) {
      return;
    }

    rotationController.turnToFaceAngle(angle, 0);
    movementController.setUserControlledSpeed(speed);
    movementController.setPosition(position);
  }, [isActive, movementController, partyMemberId, rotationController]);

  useFrame((state) => {
    moveToWaypoint(state.scene)
  });
}

export default useFollower;