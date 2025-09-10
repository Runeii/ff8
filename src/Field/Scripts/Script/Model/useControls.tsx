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
  WALKING: 0.1,
  RUNNING: 0.2,
}

type useControlsProps = {
  characterHeight: number;
  isActive: boolean;
  movementController: ReturnType<typeof createMovementController>;
  rotationController: ReturnType<typeof createRotationController>;
}

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
    const newPosition = walkmeshController.getPositionOnWalkmesh(initialPosition, 3, false);

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
  const handleFrame = useCallback(async (
    camera: PerspectiveCamera,
    scene: Scene,
    delta: number
  ) => {
    if (!isActive || !isUserControllable || !hasPlacedCharacter || isTransitioningMap) return;

    const { goal, userControlledSpeed, isPaused } = movementController.getState().position;
    if (goal && userControlledSpeed !== undefined && !isPaused) return;

    const player = getPlayerEntity(scene);
    if (!player) {
      console.warn("No player entity found in scene");
      return;
    }

    const isTurning = rotationController.getState().angle.isAnimating;
    if (!walkmeshController || !isUserControllable || isTurning) return;

    const movementAngle = handleMovement();
    if (movementAngle === null) return;

    // Rotate character to face movement direction
    rotationController.turnToFaceAngle(movementAngle, 0);

    // Determine movement speed
    const isWalking = !isRunEnabled || movementFlags.isWalking;
    const speed = isWalking ? SPEED.WALKING : SPEED.RUNNING; // units per second

    const currentPosition = movementController.getPosition();
    if (!currentPosition) return;

    // Calculate movement direction in world space
    upDirection.set(0, 0, 1);
    const meshUp = upDirection.applyQuaternion(player.quaternion).normalize();

    forwardDirection.set(0, -1, 0);
    const meshForward = forwardDirection.applyAxisAngle(meshUp, convert256ToRadians(movementAngle)).normalize();

    // Compute movement distance scaled by delta
    const moveDistance = speed * delta;
    desiredPosition.copy(currentPosition).add(meshForward.multiplyScalar(moveDistance));

    // Snap to walkmesh
    const newPosition = walkmeshController.getPositionOnWalkmesh(
      desiredPosition,
      characterHeight / 2,
      false
    );
    if (!newPosition) return;

    // Check collisions
    const blockages: Object3D[] = [];
    scene.traverse(object => {
      if (object.userData.isSolid) blockages.push(object);
    });

    const isPermitted = checkForIntersections(player, newPosition, blockages, camera);
    if (!isPermitted) return;

    // Apply movement
    movementController.setPosition(newPosition);
    movementController.setHasMoved(true);

    // Return updated info (optional)
    const movementSpeed = isWalking ? 2560 : 7560;
    return [newPosition, movementSpeed];
  }, [
    isActive,
    isUserControllable,
    hasPlacedCharacter,
    isTransitioningMap,
    movementController,
    rotationController,
    walkmeshController,
    handleMovement,
    isRunEnabled,
    movementFlags.isWalking,
    upDirection,
    forwardDirection,
    characterHeight
  ]);

  const handleUpdateCongaWaypoint = useCallback((newPosition: Vector3 | null, movementSpeed: number) => {
    const isClimbingLadder = movementController.getState().isClimbingLadder;

    if (!newPosition) {
      return;
    }
    useGlobalStore.setState(state => {
      state.hasMoved = true;

      state.congaWaypointHistory.push({
        position: newPosition.clone(),
        angle: rotationController.getState().angle.get(),
        speed: movementSpeed,
        isClimbingLadder,
      })
      if (state.congaWaypointHistory.length > 100) {
        state.congaWaypointHistory.shift();
      }
      return state;
    });
  }, [movementController, rotationController]);

  useFrame(({ scene }, delta) => {
    if (!isActive) {
      return;
    }
    const isClimbingLadder = movementController.getState().isClimbingLadder;

    if (isClimbingLadder) {
      return;
    }

    const camera = scene.getObjectByName("sceneCamera") as PerspectiveCamera;
    handleFrame(camera as PerspectiveCamera, scene, delta).then((returnedValue) => {
      const [newPosition, movementSpeed] = (returnedValue ?? [null, 0]) as [Vector3 | null, number];
      movementController.setUserControlledSpeed(movementSpeed > 0 ? movementSpeed : undefined);
      handleUpdateCongaWaypoint(newPosition,movementSpeed);
    });
  });
}

export default useControls;