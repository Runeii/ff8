import { Box } from "@react-three/drei"
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { DoubleSide, Group, Mesh, Raycaster, Vector3 } from "three";

type CharacterProps = {
  position: {
    x: number,
    y: number,
    z: number
  }
}

const direction = new Vector3();

const forwardVector = new Vector3();
const rightVector = new Vector3();
const upVector = new Vector3();

export const CHARACTER_HEIGHT = 0.08;

const Character = ({ position }: CharacterProps) => {
  const playerRef = useRef<Mesh>();


  const [isMovingForward, setIsMovingForward] = useState(false);
  const [isMovingBackward, setIsMovingBackward] = useState(false);
  const [isMovingLeft, setIsMovingLeft] = useState(false);
  const [isMovingRight, setIsMovingRight] = useState(false);

  // Key press handlers
  useEffect(() => {
    // Key press handlers
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          setIsMovingForward(true);
          break;
        case 'ArrowDown':
        case 'KeyS':
          setIsMovingBackward(true);
          break;
        case 'ArrowLeft':
        case 'KeyA':
          setIsMovingLeft(true);
          break;
        case 'ArrowRight':
        case 'KeyD':
          setIsMovingRight(true);
          break;
      }
    };
  
    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          setIsMovingForward(false);
          break;
        case 'ArrowDown':
        case 'KeyS':
          setIsMovingBackward(false);
          break;
        case 'ArrowLeft':
        case 'KeyA':
          setIsMovingLeft(false);
          break;
        case 'ArrowRight':
        case 'KeyD':
          setIsMovingRight(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame(({camera, scene}) => {
    const walkmesh = scene.getObjectByName('walkmesh') as Group | undefined;

    if (!playerRef.current || !walkmesh) {
      return
    }

    const player = playerRef.current;
    const speed = 0.008;


    camera.getWorldDirection(forwardVector);
    forwardVector.normalize();
    rightVector.crossVectors(forwardVector, camera.up).normalize();
    upVector.crossVectors(rightVector, forwardVector).normalize();

    direction.set(0, 0, 0);
    if (isMovingForward) {
      direction.add(forwardVector);
    }
    if (isMovingBackward) {
      direction.sub(forwardVector);
    }
    if (isMovingLeft) {
      direction.sub(rightVector);
    }
    if (isMovingRight) {
      direction.add(rightVector);
    }
  
    if (direction.lengthSq() === 0) {
      return;
    }

    direction.normalize().multiplyScalar(speed);

    const potentialPosition = player.position.clone().add(direction);

    const raycaster = new Raycaster(potentialPosition, upVector.negate());
    const intersects = raycaster.intersectObject(walkmesh, true);

    if (intersects.length > 0) {
      const closest = intersects[0];
      
      player.position.add(direction);
      player.position.addScaledVector(upVector, closest.point.dot(upVector) + -(CHARACTER_HEIGHT / 2) - player.position.dot(upVector));
    }
  });
  

  return (
    <Box args={[0.03, 0.03, CHARACTER_HEIGHT]} position={[position.x, position.y, position.z + CHARACTER_HEIGHT / 2]} ref={playerRef}  name="character">
      <meshBasicMaterial color={0xff0000} side={DoubleSide} />
    </Box>
  )
}

export default Character;