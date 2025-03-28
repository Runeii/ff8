import { Box } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import { Group, Mesh, Object3D, Vector3 } from "three";
import useKeyboardControls from "./useKeyboardControls";
import { useFrame, useThree } from "@react-three/fiber";
import { getCameraDirections, getCharacterForwardDirection } from "../../../../Camera/cameraUtils";
import { checkForIntersections, getPositionOnWalkmesh, WORLD_DIRECTIONS } from "../../../../../utils";
import useGlobalStore from "../../../../../store";
import  { ScriptStateStore } from "../../state";
import { convert255ToRadians, convertRadiansTo255, getRotationAngleToDirection } from "../../utils";

type ControlsProps = {
  children: React.ReactNode;
  useScriptStateStore: ScriptStateStore;
}

export const CHARACTER_HEIGHT = 0.08
const RUNNING_SPEED = 0.25;
const WALKING_SPEED = 0.08;

const direction = new Vector3();
const ZERO_VECTOR = new Vector3(0, 0, 0);

const Controls = ({ children, useScriptStateStore }: ControlsProps) => {
  const invalidate = useThree(({ invalidate }) => invalidate);
  const isRunEnabled = useGlobalStore((state) => state.isRunEnabled);
  
  const movementFlags = useKeyboardControls();

  const scene = useThree(({ scene }) => scene);

  const [hasPlacedCharacter, setHasPlacedCharacter] = useState(false);
  const initialFieldPosition = useGlobalStore((state) => state.characterPosition);
  const isTransitioningMap = useGlobalStore(state => !!state.pendingFieldId);
  const walkmesh = scene.getObjectByName("walkmesh") as Group;

  const position = useScriptStateStore(state => state.position);

  useEffect(() => {
    if (!walkmesh || !initialFieldPosition || isTransitioningMap) {
      return;
    }

    const initialPosition = new Vector3(initialFieldPosition.x, initialFieldPosition.y, initialFieldPosition.z);
    const newPosition = getPositionOnWalkmesh(initialPosition, walkmesh);
    if (newPosition) {
      position.set([newPosition.x, newPosition.y, newPosition.z]);
    } else {
      console.warn("Tried to set character position to an invalid position", initialPosition);
    }

    setHasPlacedCharacter(true);
    return () => {
      setHasPlacedCharacter(false);
    }
  }, [initialFieldPosition, isTransitioningMap, setHasPlacedCharacter, position, walkmesh]);

  const movementSpeed = useScriptStateStore(state => state.movementSpeed);
  useEffect(() => {
    useGlobalStore.setState({
      playerMovementSpeed: movementSpeed,
    });
  }, [movementSpeed]);

  const fieldDirection = useGlobalStore(state => state.fieldDirection);
  const isUserControllable = useGlobalStore(state => state.isUserControllable);
  const previousDirectionLengthSq = useRef(0);
  useFrame(({ camera, scene }, delta) => {
    if (position.isAnimating) {
      return;
    }
    const player = scene.getObjectByName("character") as Mesh;
    if (isTransitioningMap || !hasPlacedCharacter) {
      return
    }

    const walkmesh = scene.getObjectByName("walkmesh");
    
    if (!player || !walkmesh) {
      return;
    }
    
    direction.copy(ZERO_VECTOR);
    
    const {rightVector: meshMoveRight} = getCameraDirections(camera);
    const {forwardVector} = getCharacterForwardDirection(camera);
    const meshMoveDown = forwardVector.clone().negate();
    if (movementFlags.forward) {
      direction.sub(meshMoveDown);
    }
    
    if (movementFlags.backward) {
      direction.add(meshMoveDown);
    }
    
    if (movementFlags.left) {
      direction.sub(meshMoveRight);
    }
    
    if (movementFlags.right) {
      direction.add(meshMoveRight);
    }

    if (direction.lengthSq() <= 0 && direction.lengthSq() === previousDirectionLengthSq.current) {
      return;
    }

    invalidate()

    previousDirectionLengthSq.current = direction.lengthSq();

    if (direction.lengthSq() <= 0 || !isUserControllable) {
      useScriptStateStore.setState({
        movementSpeed: 0,
      })
      return;
    }

    const isWalking = !isRunEnabled || movementFlags.isWalking;
    const speed = isWalking ? WALKING_SPEED : RUNNING_SPEED
    direction.normalize().multiplyScalar(speed).multiplyScalar(delta);

    useScriptStateStore.setState({
      movementSpeed: isWalking ? 2560 : 7560,
    });

    const desiredPosition = new Vector3().fromArray(position.get()).add(direction);

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
      console.log('not permitted')
      return;
    }
    
    direction.z = 0;
    direction.normalize();


    position.start([newPosition.x, newPosition.y, newPosition.z], {
      immediate: true,
    });

    useGlobalStore.setState({
      hasMoved: true,
    });
    // Current forward
    const meshForward = new Vector3(-1,0,0).applyQuaternion(player.quaternion).normalize();
    meshForward.z = 0;

    // Get up axis
    const meshUp = new Vector3(0, 0, 1).applyQuaternion(player.quaternion).normalize();
  
    // Calculate initial angle to face down
    const base = convert255ToRadians(fieldDirection);
    const baseDirection = WORLD_DIRECTIONS.FORWARD.clone().applyAxisAngle(meshUp, base);
    const faceDownBaseAngle = getRotationAngleToDirection(meshForward, baseDirection, meshUp);

    const targetAngle = getRotationAngleToDirection(meshForward, direction, meshUp);
    
    let radian = (targetAngle - faceDownBaseAngle) % (Math.PI * 2);
    if (radian < 0) {
      radian += Math.PI * 2; // Ensure the angle is in the range [0, 2π)
    }

    const newAngle = convertRadiansTo255(radian);
    useScriptStateStore.getState().angle.set(newAngle);

    useGlobalStore.setState((storeState) => {
      const latestCongaWaypoint = storeState.congaWaypointHistory[0];
      if (latestCongaWaypoint && latestCongaWaypoint.position.distanceTo(newPosition) < 0.003) {
        return storeState;
      }
      return {
        ...storeState,
        congaWaypointHistory: [
          {
            position: newPosition,
            angle: newAngle,
          },
          ...storeState.congaWaypointHistory,
        ],
      }
    });
  });

  const isDebugMode = useGlobalStore(state => state.isDebugMode);

  return (
    <group name="character">
      {children}
      <Box args={[0.05, 0.05, CHARACTER_HEIGHT + 1]} position={[0,0,CHARACTER_HEIGHT / 2]} name="hitbox" visible={isDebugMode}>
        <meshBasicMaterial color="green" opacity={0.2} transparent />
      </Box>
    </group>
  );
}

export default Controls;