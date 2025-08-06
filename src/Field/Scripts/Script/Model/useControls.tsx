import { useCallback, useEffect, useState } from "react";
import { Group, Object3D, PerspectiveCamera, Scene, Vector3 } from "three";
import useKeyboardControls from "./useKeyboardControls";
import { useFrame, useThree } from "@react-three/fiber";
import { checkForIntersections, getPositionOnWalkmesh } from "../../../../utils";
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

  const scene = useThree(({ scene }) => scene);

  const [hasPlacedCharacter, setHasPlacedCharacter] = useState(false);
  
  const isUserControllable = useGlobalStore(state => state.isUserControllable);
  const initialFieldPosition = useGlobalStore((state) => state.characterPosition);
  const isTransitioningMap = useGlobalStore(state => !!state.pendingFieldId);
  const walkmesh = scene.getObjectByName("walkmesh") as Group;

  useEffect(() => {
    if (movementController.getState().footsteps.leftSound) {
      return;
    }

    movementController.setFootsteps();
  }, [movementController]);

  useEffect(() => {
    if (!isActive) {
      return;
    }
    if (!walkmesh || !initialFieldPosition || isTransitioningMap) {
      return;
    }

    const initialPosition = new Vector3(initialFieldPosition.x, initialFieldPosition.y, initialFieldPosition.z);
    const newPosition = getPositionOnWalkmesh(initialPosition, walkmesh);

    if (newPosition) {
      movementController.setPosition(newPosition);
    } else {
      console.warn("Tried to set character position to an invalid position", initialPosition);
    }

    setHasPlacedCharacter(true);
    return () => {
      setHasPlacedCharacter(false);
    }
  }, [initialFieldPosition, isTransitioningMap, setHasPlacedCharacter, movementController, walkmesh, isActive]);

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

  const handleFrame = useCallback(async (camera: PerspectiveCamera, scene: Scene, delta: number) => {
    if (!isActive || !isUserControllable || !hasPlacedCharacter || isTransitioningMap) {
      return;
    }
    if (movementController.getState().position.goal && movementController.getState().position.userControlledSpeed !== undefined) {
      return;
    }
    
    const player = getPlayerEntity(scene);
    if (!player) {
      console.warn("No player entity found in scene");
      return;
    }

    const walkmesh = scene.getObjectByName("walkmesh");
    const isTurning = rotationController.getState().angle.isAnimating;
    if (!walkmesh || !isUserControllable || isTurning) {
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

    let meshForward = new Vector3(0,-1,0).clone();
    meshForward.z = 0;
    const meshUp = new Vector3(0, 0, 1).applyQuaternion(player.quaternion).normalize();
    meshForward = meshForward.applyAxisAngle(meshUp, convert256ToRadians(movementAngle));

    const directionAdjustmentForSpeed = speed * 1000;
    desiredPosition.set(
      currentPosition.x,
      currentPosition.y,
      currentPosition.z
    ).add(meshForward.divideScalar(directionAdjustmentForSpeed))

    const newPosition = getPositionOnWalkmesh(desiredPosition, walkmesh, characterHeight / 2);
    
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
      userControlledSpeed: movementSpeed,
    });

    useGlobalStore.setState(state => {
      state.hasMoved = true;

      const latestCongaWaypoint = state.congaWaypointHistory[0];
      if (latestCongaWaypoint && latestCongaWaypoint.position.distanceTo(newPosition) < 0.005) {
        return state;
      }
      state.congaWaypointHistory.push({
        position: newPosition.clone(),
        angle: movementAngle,
        speed: movementSpeed
      })
      if (state.congaWaypointHistory.length > 100) {
        state.congaWaypointHistory.shift();
      }
      return state;
    });
  }, [isActive, isUserControllable, hasPlacedCharacter, isTransitioningMap, rotationController, handleMovement, isRunEnabled, movementFlags.isWalking, movementController, characterHeight]);

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