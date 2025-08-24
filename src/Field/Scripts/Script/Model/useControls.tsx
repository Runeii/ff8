import { useCallback, useEffect, useRef, useState } from "react";
import { Object3D, PerspectiveCamera, Scene, Vector3 } from "three";
import useKeyboardControls from "./useKeyboardControls";
import { useFrame } from "@react-three/fiber";
import { checkForIntersections } from "../../../../utils";
import useGlobalStore from "../../../../store";
import { convert256ToRadians } from "../utils";
import createMovementController from "../MovementController/MovementController";
import createRotationController from "../RotationController/RotationController";
import { getPlayerEntity } from "./modelUtils";

const SPEED = {
  WALKING: 1.2,
  RUNNING: 0.6,
}

type useControlsProps = {
  characterHeight: number;
  isActive: boolean;
  movementController: ReturnType<typeof createMovementController>;
  rotationController: ReturnType<typeof createRotationController>;
}

const direction = new Vector3();
const desiredPosition = new Vector3(0, 0, 0);

const useControls = ({ characterHeight, isActive, movementController, rotationController }: useControlsProps) => {
  const isRunEnabled = useGlobalStore((state) => state.isRunEnabled);
  
  const movementFlags = useKeyboardControls();

  const [hasPlacedCharacter, setHasPlacedCharacter] = useState(false);
  
  const isUserControllable = useGlobalStore(state => state.isUserControllable);
  const initialFieldPosition = useGlobalStore((state) => state.characterPosition);
  const isTransitioningMap = useGlobalStore(state => !!state.pendingFieldId);
  const walkmeshController = useGlobalStore(state => state.walkmeshController);

  useEffect(() => {
    if (movementController.getState().footsteps.leftSound) {
      return;
    }

    movementController.setFootsteps();
  }, [movementController]);

  const characterHeightRef = useRef(characterHeight);
  useEffect(() => {
    characterHeightRef.current = characterHeight;
  }, [characterHeight]);

  useEffect(() => {
    if (!isActive) {
      return;
    }
    if (!walkmeshController || !initialFieldPosition || isTransitioningMap) {
      return;
    }

    const initialPosition = new Vector3(initialFieldPosition.x, initialFieldPosition.y, initialFieldPosition.z);
    const newPosition = walkmeshController.getPositionOnWalkmesh(initialPosition, 1, false);

    if (newPosition) {
      movementController.setPosition(newPosition);
    } else {
      console.warn("Tried to set character position to an invalid position", initialPosition);
    }

    setHasPlacedCharacter(true);
    return () => {
      setHasPlacedCharacter(false);
    }
  }, [initialFieldPosition, isTransitioningMap, setHasPlacedCharacter, movementController, walkmeshController, isActive]);

  const controlDirection = useGlobalStore(state => state.fieldDirection);

  const handleMovement = useCallback(() => { 
    let x = 0;
    let y = 0;
    
    if (movementFlags.forward) {
      y += 1;
    }
    if (movementFlags.backward) {
      y -= 1;
    }
    if (movementFlags.right) {
      x -= 1;
    }
    if (movementFlags.left) {
      x += 1;
    }
    
    if (x === 0 && y === 0) {
      return null;
    }
    
    const radians = Math.atan2(x, y);

    const angle = Math.round(radians / Math.PI * 128) - 128 + 256;

    return angle + (controlDirection - 128);
  }, [movementFlags, controlDirection]);

  const [forwardDirection] = useState(new Vector3(0, -1, 0));
  const [upDirection] = useState(new Vector3(0, 0, 1));
  const [currentPositionVector] = useState(new Vector3());

  const playerEntityRef = useRef<Object3D | null>(null);
  const partyLeader = useGlobalStore((state) => state.party[0]);
  useEffect(() => {
    playerEntityRef.current = null
  }, [partyLeader]);

  const handleFrame = useCallback(async (camera: PerspectiveCamera, scene: Scene, delta: number) => {
    if (!isActive || !isUserControllable || !hasPlacedCharacter || isTransitioningMap) {
      return;
    }

    const { goal, userControlledSpeed, isPaused } = movementController.getState().position;

    if (goal && userControlledSpeed !== undefined && !isPaused) {
      return;
    }
    
    const player = playerEntityRef.current ?? getPlayerEntity(scene);
    if (!player) {
      console.warn("No player entity found in scene");
      return;
    }

    playerEntityRef.current = player;

    const isTurning = rotationController.getState().angle.isAnimating;
    if (!walkmeshController || !isUserControllable || isTurning) {
      return;
    }

    const movementAngle = handleMovement();

    if (movementAngle === null) {
      return;
    }

    rotationController.turnToFaceAngle(movementAngle, 0);

    const isWalking = !isRunEnabled || movementFlags.isWalking;
    const speed = isWalking ? SPEED.WALKING : SPEED.RUNNING
    direction.normalize().multiplyScalar(speed).multiplyScalar(delta);
    const movementSpeed = isWalking ? 2560 : 7560

    const currentPosition = movementController.getPosition();
    if (!currentPosition) {
      return;
    }

    upDirection.set(0, 0, 1);
    const meshUp = upDirection.applyQuaternion(player.quaternion).normalize();

    forwardDirection.set(0, -1, 0);
    const meshForward = forwardDirection.applyAxisAngle(meshUp, convert256ToRadians(movementAngle));

    const directionAdjustmentForSpeed = speed * 1000;
    desiredPosition.set(
      currentPosition.x,
      currentPosition.y,
      currentPosition.z
    ).add(meshForward.divideScalar(directionAdjustmentForSpeed))

    currentPositionVector.copy(currentPosition);
    const newPosition = walkmeshController.getPositionOnWalkmesh(
      desiredPosition,
      characterHeight / 2,
      false,
      true
    );

    if (!newPosition) {
      return
    }

    const blockages: Object3D[] = [];
    scene.traverse((object) => {
      if (object.userData.isSolid) {
        blockages.push(object);
      }
    });

    const isPermitted = checkForIntersections(player, newPosition, blockages, camera);

    if (!isPermitted) {
      return;
    }
    await movementController.moveToPoint(newPosition, {
      isAnimationEnabled: true,
      isAllowedToCrossBlockedTriangles: false,
      userControlledSpeed: movementSpeed,
    });
  }, [isActive, isUserControllable, hasPlacedCharacter, isTransitioningMap, movementController, rotationController, walkmeshController, handleMovement, isRunEnabled, movementFlags.isWalking, upDirection, forwardDirection, currentPositionVector, characterHeight]);

  useFrame(({ scene }, delta) => {
    if (!isActive) {
      return;
    }
    const isClimbingLadder = movementController.getState().isClimbingLadder;

    if (isClimbingLadder) {
      return;
    }

    const camera = scene.getObjectByName("sceneCamera") as PerspectiveCamera;
    handleFrame(camera as PerspectiveCamera, scene, delta);
  });
}

export default useControls;