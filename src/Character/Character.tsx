import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { Group, Vector3 } from "three";
import { getCameraDirections } from "../Field/Camera/cameraUtils";
import { getPositionOnWalkmesh } from "../utils";
import { onMovementKeyPress } from "./characterUtils";
import Squall, { ActionName } from "./Squall";
import { Sphere } from "@react-three/drei";
import useGlobalStore from "../store";

export const CHARACTER_HEIGHT = 0.06;
const RUNNING_SPEED = 0.0018;
const WALKING_SPEED = 0.0005;

const direction = new Vector3();
const ZERO_VECTOR = new Vector3(0, 0, 0);

type CharacterProps = {
  setHasPlacedCharacter: (value: boolean) => void;
};

const Character = ({ setHasPlacedCharacter }: CharacterProps) => {
  const position = useGlobalStore((state) => state.characterPosition) as Vector3;

  const { camera, scene } = useThree();
  const playerRef = useRef<Group>(null);
  const movementFlagsRef = useRef<MovementFlags>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    isWalking: false,
  });

  useEffect(() => {
    const handleKeyDown = onMovementKeyPress(movementFlagsRef, true);
    const handleKeyUp = onMovementKeyPress(movementFlagsRef, false);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const walkmesh = scene.getObjectByName("walkmesh") as Group;

    if (!walkmesh) {
      return;
    }

    const initialPosition = new Vector3(position.x, position.y, position.z);
    const newPosition = getPositionOnWalkmesh(initialPosition, walkmesh);

    if (newPosition) {
      newPosition.z += CHARACTER_HEIGHT / 2;
      playerRef.current?.position.set(
        newPosition.x,
        newPosition.y,
        newPosition.z
      );
    } else {
      console.warn("Tried to set character position to an invalid position", position);
    }

    setHasPlacedCharacter(true);
  }, [position, scene, setHasPlacedCharacter]);

  const [currentAction, setCurrentAction] = useState<ActionName>("stand");
  useFrame(() => {
    const walkmesh = scene.getObjectByName("walkmesh");
    const player = playerRef.current;
    const movementFlags = movementFlagsRef.current;

    if (!player || !walkmesh) {
      return;
    }


    direction.copy(ZERO_VECTOR);
    const { forwardVector, rightVector, upVector } = getCameraDirections(camera);

    let characterForwardsVector = upVector;

    if (Math.abs(forwardVector.z) < 0.9) {
      forwardVector.setZ(0)
      rightVector.setZ(0)

      characterForwardsVector = forwardVector;
    }

    if (movementFlags.forward) {
      direction.add(characterForwardsVector);
    }

    if (movementFlags.backward) {
      direction.sub(characterForwardsVector);
    }

    if (movementFlags.left) {
      direction.sub(rightVector);
    }

    if (movementFlags.right) {
      direction.add(rightVector);
    }
    
    const isAllowedToMove = useGlobalStore.getState().isUserControllable;
    if (direction.lengthSq() <= 0 || !isAllowedToMove) {
      setCurrentAction("stand");
      return;
    }
    
    direction.normalize().multiplyScalar(movementFlags.isWalking ? WALKING_SPEED : RUNNING_SPEED);
    setCurrentAction(movementFlags.isWalking ? 'walk' : "run");
  
    const desiredPosition = player.position.clone().add(direction);
    const newPosition = getPositionOnWalkmesh(desiredPosition, walkmesh, CHARACTER_HEIGHT);
    
    if (!newPosition) {
      return
    }

    direction.z = 0;
    direction.normalize();

    const angle = Math.atan2(direction.y, direction.x);

    player.rotation.z = angle - Math.PI / 2;
    player.position.set(newPosition.x, newPosition.y, newPosition.z);
  });

  return (
    <Squall currentAction={currentAction} scale={0.06} rotation={[0,0,0]} ref={playerRef} name="character">
      <Sphere args={[0.3, 32, 32]} position={[0, 0, 0.1]} name="hitbox" visible={false} />
    </Squall>
  );
};

export default Character;
