import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { Group, Object3D, Vector3 } from "three";
import { getCameraDirections } from "../Field/Camera/cameraUtils";
import { checkForIntersections, getPositionOnWalkmesh } from "../utils";
import { onMovementKeyPress } from "./characterUtils";
import Squall, { ActionName } from "./Squall";
import { Box, OrbitControls } from "@react-three/drei";
import useGlobalStore from "../store";
import Focus from "./Focus/Focus";
import { useSpring } from "@react-spring/three";

export const CHARACTER_HEIGHT = 0.06;
const RUNNING_SPEED = 0.3;
const WALKING_SPEED = 0.08;

const direction = new Vector3();
const ZERO_VECTOR = new Vector3(0, 0, 0);

type CharacterProps = {
  hasPlacedCharacter: boolean;
  setHasPlacedCharacter: (value: boolean) => void;
};


const Character = ({ hasPlacedCharacter, setHasPlacedCharacter }: CharacterProps) => {
  const characterPosition = useGlobalStore((state) => state.characterPosition) as Vector3;
  const isTransitioningMap = useGlobalStore((state) => state.isTransitioningMap);
  const isRunEnabled = useGlobalStore((state) => state.isRunEnabled);

  const { camera, scene } = useThree();
  const playerRef = useRef<Group>(null);
  const movementFlagsRef = useRef<MovementFlags>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    isWalking: false,
  });

  const [, setPositionSpring] = useSpring(() => ({
    position: [0,0,0],
    config: {
      duration: 10,
    },
    onChange: ({ value }) => {
      playerRef.current?.position.set(value.position[0], value.position[1], value.position[2]);
    }
  }), [characterPosition]);

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

    if (!walkmesh || !characterPosition || isTransitioningMap) {
      return;
    }

    const initialPosition = new Vector3(characterPosition.x, characterPosition.y, characterPosition.z);
    const newPosition = getPositionOnWalkmesh(initialPosition, walkmesh);
    if (newPosition) {
      setPositionSpring({
        position: [newPosition.x, newPosition.y, newPosition.z],
        immediate: true,
      });
    } else {
      console.warn("Tried to set character position to an invalid position", characterPosition);
    }

    setHasPlacedCharacter(true);
  }, [characterPosition, isTransitioningMap, scene, setHasPlacedCharacter, setPositionSpring]);

  const [currentAction, setCurrentAction] = useState<ActionName>("d001_act1");
  useFrame((_, delta) => {
    if (isTransitioningMap || !hasPlacedCharacter) {
      return
    }

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
      setCurrentAction("d001_act0");
      return;
    }
    
    const isWalking = !isRunEnabled || movementFlags.isWalking;
    direction.normalize().multiplyScalar(isWalking ? WALKING_SPEED : RUNNING_SPEED).multiplyScalar(delta);
    setCurrentAction(isWalking ? 'd001_act1' : "d001_act2");
  
    const desiredPosition = player.position.clone().add(direction);

    const newPosition = getPositionOnWalkmesh(desiredPosition, walkmesh, CHARACTER_HEIGHT);


    if (!newPosition) {
      return
    }

    const closedDoors: Object3D[] = [];
    scene.traverse((object) => {
      if (object.name === "door-closed") {
        closedDoors.push(object);
      }
    });
  
    const isPermitted = checkForIntersections(player.position, newPosition, closedDoors);
  
    if (!isPermitted) {
      return;
    }

    direction.z = 0;
    direction.normalize();

    const angle = Math.atan2(direction.y, direction.x);

    player.rotation.z = angle - Math.PI * 2
    player.userData.hasMoved = true;
    setPositionSpring({ position: [newPosition.x, newPosition.y, newPosition.z] });
  });

  return (
    <Squall currentAction={currentAction} scale={0.06} name="character" ref={playerRef}>
      <Box args={[0.5, 0.5, 1.2]} position={[0,0,0.6]} name="hitbox" visible={true} />
      <Focus />
    </Squall>
  );
};

export default Character;
