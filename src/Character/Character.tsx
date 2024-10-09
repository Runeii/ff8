import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { DoubleSide, Group, Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from "three";
import { getCameraDirections } from "../Field/Camera/cameraUtils";
import { getPositionOnWalkmesh } from "../utils";
import { onMovementKeyPress } from "./characterUtils";
import Squall from "./Squall";

export const CHARACTER_HEIGHT = 0.06;
const RUNNING_SPEED = 0.0016;
const WALKING_SPEED = 0.0005;

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
      // Create a yellow sphere and add to scene at position

      const sphere = new Mesh(new SphereGeometry(0.1, 32, 32), new MeshBasicMaterial({color: 'yellow', side: DoubleSide}));
      sphere.position.copy(position);
    //  scene.add(sphere);

      console.warn("Tried to set character position to an invalid position", position);

    }
    setHasPlacedCharacter(true);
  }, [position, scene, setHasPlacedCharacter]);

  const [currentAction, setCurrentAction] = useState("stand");
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

    direction.z = 0; // Nullify the Y component to constrain to horizontal rotation only
    direction.normalize();

    // 3. Calculate the angle between the mesh’s forward direction and the direction vector
    // Assuming mesh's forward direction is along the positive Z-axis
    const angle = Math.atan2(direction.y, direction.x);

    // 4. Apply the rotation around the Y-axis
    player.rotation.z = angle - Math.PI / 2;
   // player.rotation.x = currentRotation.x
   // player.rotation.y *= -1
   // player.rotation.z = currentRotation.z
    player.position.set(newPosition.x, newPosition.y, newPosition.z);
  });

  return (
    <Squall currentAction={currentAction} scale={0.045} rotation={[0,0,0]} ref={playerRef} name="character" />
  );
};

export default Character;
