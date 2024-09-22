import { Box } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { DoubleSide, Mesh, Object3D, Raycaster, Vector3 } from "three";
import { getCameraDirections } from "../Field/Camera/cameraUtils";

type CharacterProps = {
  position: {
    x: number;
    y: number;
    z: number;
  };
};

export const CHARACTER_HEIGHT = 0.08;
export const SPEED = 0.004;

const direction = new Vector3();

const handleKeyChange = (movementFlags: any, value: boolean) => (event: KeyboardEvent) => {
  switch (event.code) {
    case "ArrowUp":
    case "KeyW":
      movementFlags.current.forward = value;
      break;
    case "ArrowDown":
    case "KeyS":
      movementFlags.current.backward = value;
      break;
    case "ArrowLeft":
    case "KeyA":
      movementFlags.current.left = value;
      break;
    case "ArrowRight":
    case "KeyD":
      movementFlags.current.right = value;
      break;
  }
};

const raycaster = new Raycaster();
const getPositionOnWalkmesh = (desiredPosition: Vector3, walkmesh: Object3D, maxDistance?: number) => {
  let intersects = [];
  raycaster.set(desiredPosition, new Vector3(0, 0, -1));
  intersects.push(raycaster.intersectObject(walkmesh, true));

  raycaster.set(desiredPosition, new Vector3(0, 0, 1));
  intersects.push(raycaster.intersectObject(walkmesh, true));

  intersects = intersects.flat()
  
  if (maxDistance) {
    intersects = intersects.filter((intersect) =>  intersect.distance < maxDistance);
  }

  if (intersects.length === 0) {
    return null;
  }

  const sortedIntersects = intersects.sort((a, b) => {
    return a.distance - b.distance;
  });


  sortedIntersects[0].point.z += CHARACTER_HEIGHT / 2;
  return sortedIntersects[0].point;
}

const Character = ({ position }: CharacterProps) => {
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);

  const playerRef = useRef<Mesh>();
  const movementFlagsRef = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });

  useEffect(() => {
    const handleKeyDown = handleKeyChange(movementFlagsRef, true);
    const handleKeyUp = handleKeyChange(movementFlagsRef, false);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [camera]);

  useEffect(() => {
    if (!playerRef.current) {
      return;
    }
    console.log('Received a new start position')
    playerRef.current.userData.hasBeenPlacedInScene = false;
  }, [position]);

  useFrame(() => {
    if (!playerRef.current || playerRef.current.userData.hasBeenPlacedInScene) {
      return;
    }

    const walkmesh = scene.getObjectByName("walkmesh");

    if (!playerRef.current || !walkmesh) {
      return;
    }

    const newPosition = getPositionOnWalkmesh(new Vector3(position.x, position.y, position.z), walkmesh);

    if (!newPosition) {
      console.warn('Tried to set character position to an invalid position');
      return;
    }
    
    playerRef.current.position.set(
      newPosition.x,
      newPosition.y,
      newPosition.z
    );

    playerRef.current.userData.hasBeenPlacedInScene = true;
  });

  useFrame(() => {
    const walkmesh = scene.getObjectByName("walkmesh");
    const player = playerRef.current;
    const movementFlags = movementFlagsRef.current;

    if (!player || !walkmesh) {
      return;
    }

    direction.set(0, 0, 0);
    const {upVector, forwardVector, rightVector} = getCameraDirections(camera);

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
    
    if (direction.lengthSq() > 0) {
      direction.normalize().multiplyScalar(SPEED);
    }
  
    if (direction.lengthSq() === 0) {
      return;
    }

    const desiredPosition = player.position.clone().add(direction);
    const newPosition = getPositionOnWalkmesh(desiredPosition, walkmesh, CHARACTER_HEIGHT);
   
    if (!newPosition) {
      return
    }

    player.position.set(newPosition.x, newPosition.y, newPosition.z);
  });

  return (
    <Box args={[0.03, 0.03, CHARACTER_HEIGHT]} ref={playerRef} name="character">
      <meshBasicMaterial color={0xff0000} side={DoubleSide} />
    </Box>
  );
};

export default Character;
