import { Box } from "@react-three/drei";
import { useCallback, useEffect, useState } from "react";
import { Group, Mesh, Object3D, PerspectiveCamera, Scene, Vector3 } from "three";
import useKeyboardControls from "./useKeyboardControls";
import { useFrame, useThree } from "@react-three/fiber";
import { checkForIntersections, getPositionOnWalkmesh } from "../../../../../utils";
import useGlobalStore from "../../../../../store";
import { convert256ToRadians } from "../../utils";
import createMovementController, { SPEED } from "../../MovementController/MovementController";
import createRotationController from "../../RotationController/RotationController";

type ControlsProps = {
  children: React.ReactNode;
  movementController: ReturnType<typeof createMovementController>;
  rotationController: ReturnType<typeof createRotationController>;
}

export const CHARACTER_HEIGHT = 0.08

const direction = new Vector3();
const desiredPosition = new Vector3(0, 0, 0);

const Controls = ({ children, movementController, rotationController }: ControlsProps) => {
  const isRunEnabled = useGlobalStore((state) => state.isRunEnabled);
  
  const movementFlags = useKeyboardControls();

  const scene = useThree(({ scene }) => scene);

  const [hasPlacedCharacter, setHasPlacedCharacter] = useState(false);
  const initialFieldPosition = useGlobalStore((state) => state.characterPosition);
  const isTransitioningMap = useGlobalStore(state => !!state.pendingFieldId);
  const walkmesh = scene.getObjectByName("walkmesh") as Group;

  const { position } = movementController.getState();

  useEffect(() => {
    if (movementController.getState().footsteps.leftSound) {
      return;
    }

    movementController.setFootsteps();
  }, [movementController]);

  useEffect(() => {
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
  }, [initialFieldPosition, isTransitioningMap, setHasPlacedCharacter, movementController, walkmesh]);

  const isUserControllable = useGlobalStore(state => state.isUserControllable);
  const isClimbingLadder = movementController.getState().isClimbingLadder;
  const controlDirection = useGlobalStore(state => state.fieldDirection);

  const handleMovement = useCallback(() => { 
    let x = 0;
    let y = 0;
    
    if (movementFlags.forward) {
      y -= 1;
    }
    if (movementFlags.backward) {
      y += 1;
    }
    if (movementFlags.right) {
      x += 1;
    }
    if (movementFlags.left) {
      x -= 1;
    }
    
    if (x === 0 && y === 0) {
      return null;
    }
    
    const radians = Math.atan2(x, y);

    const angle = Math.round(((radians / (2 * Math.PI)) * 256 + 256) % 256);
    
    return angle;
  }, [movementFlags]);

  const handleFrame = useCallback(async (camera: PerspectiveCamera, scene: Scene, delta: number) => {
    const player = scene.getObjectByName("character") as Mesh;
    if (isTransitioningMap || !hasPlacedCharacter) {
      return
    }

    const walkmesh = scene.getObjectByName("walkmesh");
    
    if (!player || !walkmesh || !isUserControllable) {
      return;
    }

    const movementAngle = handleMovement();

    if (movementAngle === null) {
      movementController.setMovementSpeed(0);
      return;
    }

    rotationController.turnToFaceAngle(movementAngle, 0);

    const isWalking = !isRunEnabled || movementFlags.isWalking;
    const speed = isWalking ? SPEED.WALKING : SPEED.RUNNING
    direction.normalize().multiplyScalar(speed).multiplyScalar(delta);

    movementController.setMovementSpeed(isWalking ? 2560 : 7560);

    const currentPosition = position.get();
    if (!currentPosition) {
      return;
    }

    let meshForward = new Vector3(0,1,0).normalize();
    meshForward.z = 0;

    const meshUp = new Vector3(0, 0, 1).applyQuaternion(player.quaternion).normalize();
    meshForward = meshForward.applyAxisAngle(meshUp, convert256ToRadians(movementAngle + controlDirection));

    const directionAdjustmentForSpeed = speed * 600;
    desiredPosition.set(
      currentPosition[0],
      currentPosition[1],
      currentPosition[2]
    ).add(meshForward.divideScalar(directionAdjustmentForSpeed))

    const newPosition = getPositionOnWalkmesh(desiredPosition, walkmesh, CHARACTER_HEIGHT);
    
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
      duration: 16,
      isFacingTarget: false,
    });

    useGlobalStore.setState({
      hasMoved: true,
    });
    useGlobalStore.setState((storeState) => {
      const latestCongaWaypoint = storeState.congaWaypointHistory[0];
      if (latestCongaWaypoint && latestCongaWaypoint.position.distanceTo(newPosition) < 0.005) {
        return storeState;
      }
      return {
        ...storeState,
        hasMoved: true,
        congaWaypointHistory: [
          {
            position: newPosition.clone(),
            angle: movementAngle,
          },
          ...storeState.congaWaypointHistory,
        ],
      }
    });
  }, [isTransitioningMap, hasPlacedCharacter, isUserControllable, handleMovement, rotationController, isRunEnabled, movementFlags.isWalking, movementController, position, controlDirection]);

  useFrame(({ camera, scene }, delta) => {
    if (movementController.getState().position.isAnimating || isClimbingLadder) {
      return;
    }

    handleFrame(camera as PerspectiveCamera, scene, delta);
  });

  const isDebugMode = useGlobalStore(state => state.isDebugMode);

  return (
    <group name="character">
      {children}
      <Box args={[0.03, 0.03, CHARACTER_HEIGHT] } position={[0,0,CHARACTER_HEIGHT / 2.5]} name="hitbox" visible={isDebugMode}>
        <meshBasicMaterial color="green" opacity={0.9} transparent />
      </Box>
    </group>
  );
}

export default Controls;