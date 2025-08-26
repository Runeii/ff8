import { Vector3 } from "three";
import createMovementController from "./MovementController";
import { createAnimationController } from "../AnimationController/AnimationController";
import useGlobalStore from "../../../../store";

export const handleLadder = async (
  animationController: ReturnType<typeof createAnimationController>,
  movementController: ReturnType<typeof createMovementController>,
  middle: Vector3,
  end: Vector3,
  isUp: boolean
) => {
  const hasStartedWithPlayerOnLadder = useGlobalStore.getState().isPlayerClimbingLadder;
  console.log('Has started climbing ladder:', hasStartedWithPlayerOnLadder);
  const startedClimbingOnFieldId = useGlobalStore.getState().fieldId;
  movementController.setIsClimbingLadder(true);
  useGlobalStore.setState({ isPlayerClimbingLadder: true });

  const position = movementController.getPosition();

  const standingPosition = new Vector3(position.x, position.y, position.z);
  const startLadderClimbPosition = new Vector3(middle.x, middle.y, standingPosition.z);
  const endLadderClimbPosition = new Vector3(middle.x, middle.y, end.z);
  const finalStandingPosition = new Vector3(end.x, end.y, end.z);

  const enterAnimation = isUp ? animationController.playLadderTopAnimation : animationController.playLadderBottomAnimation

  await Promise.all([
    movementController.moveToPoint(startLadderClimbPosition, {
      isFacingTarget: false,
      isAllowedToCrossBlockedTriangles: true,
      isAllowedToLeaveWalkmesh: true,
      isAnimationEnabled: false
    }),
    hasStartedWithPlayerOnLadder ? Promise.resolve() : enterAnimation('enter')    
  ]);

  await movementController.moveToPoint(endLadderClimbPosition, {
    isFacingTarget: false,
    isAllowedToCrossBlockedTriangles: true,
    isAllowedToLeaveWalkmesh: true,
    isAnimationEnabled: false
  })

  const checkIfIsStillOnMap = () =>
    useGlobalStore.getState().fieldId === startedClimbingOnFieldId &&
    !useGlobalStore.getState().pendingFieldId;

  if (!checkIfIsStillOnMap()) {
    return;
  }

  const exitAnimation = isUp ? animationController.playLadderTopAnimation : animationController.playLadderBottomAnimation;
  await Promise.all([
    movementController.moveToPoint(finalStandingPosition, {
      isFacingTarget: false,
      isAllowedToCrossBlockedTriangles: true,
      isAllowedToLeaveWalkmesh: true,
      isAnimationEnabled: false
    }),
    exitAnimation('exit')
  ])

  if (!checkIfIsStillOnMap()) {
    return;
  }
  console.log('Has finished climbing ladder');
  useGlobalStore.setState({ isPlayerClimbingLadder: false });
  movementController.setIsClimbingLadder(false);
  animationController.playMovementAnimation('stand');
};
