import { Box } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { DoubleSide, Group, Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from "three";
import { getCameraDirections } from "../Field/Camera/cameraUtils";
import { getPositionOnWalkmesh } from "../utils";
import { onMovementKeyPress } from "./characterUtils";

export const CHARACTER_HEIGHT = 0.06;
const CHARACTER_WIDTH = 0.02;
export const SPEED = 0.004;

const direction = new Vector3();
const ZERO_VECTOR = new Vector3(0, 0, 0);

type CharacterProps = {
  position: {
    x: number;
    y: number;
    z: number;
  };
  setHasPlacedCharacter: (value: boolean) => void;
};

const Character = ({ position, setHasPlacedCharacter }: CharacterProps) => {
  const { camera, scene } = useThree();
  const playerRef = useRef<Mesh>(null);
  const movementFlagsRef = useRef<MovementFlags>({
    forward: false,
    backward: false,
    left: false,
    right: false,
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
      // Create a yellow sphere and add to scene at position

      const sphere = new Mesh(new SphereGeometry(0.05, 32, 32), new MeshBasicMaterial({color: 'yellow'}));
      sphere.position.copy(position);
      scene.add(sphere);

      console.warn("Tried to set character position to an invalid position", position);

    }
    setHasPlacedCharacter(true);
  }, [position, scene, setHasPlacedCharacter]);

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
    
    if (direction.lengthSq() <= 0) {
      return;
    }

    
    direction.normalize().multiplyScalar(SPEED);
  
    const desiredPosition = player.position.clone().add(direction);
    const newPosition = getPositionOnWalkmesh(desiredPosition, walkmesh, CHARACTER_HEIGHT);
    
    if (!newPosition) {
      return
    }
    
    newPosition.z += CHARACTER_HEIGHT / 2;
    player.position.set(newPosition.x, newPosition.y, newPosition.z);
  });

  return (
    <Box args={[CHARACTER_WIDTH, CHARACTER_WIDTH, CHARACTER_HEIGHT]} ref={playerRef} name="character">
      <meshBasicMaterial color={0xff0000} side={DoubleSide} />
    </Box>
  );
};

export default Character;
