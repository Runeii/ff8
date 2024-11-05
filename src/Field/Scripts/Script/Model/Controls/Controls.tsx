import { Box } from "@react-three/drei";
import { ScriptState } from "../../../types";
import { useEffect, useState } from "react";
import { AnimationAction, Group, Mesh, Object3D, Vector3 } from "three";
import useKeyboardControls from "./useKeyboardControls";
import { useFrame, useThree } from "@react-three/fiber";
import { getCameraDirections } from "../../../../Camera/cameraUtils";
import { checkForIntersections, getPositionOnWalkmesh } from "../../../../../utils";
import useGlobalStore from "../../../../../store";
import { radToDeg } from "three/src/math/MathUtils.js";

type ControlsProps = {
  actions: Record<string, AnimationAction>;
  children: React.ReactNode;
  state: ScriptState;
}

export const CHARACTER_HEIGHT = 0.08
const RUNNING_SPEED = 0.25  ;
const WALKING_SPEED = 0.08;

const direction = new Vector3();
const ZERO_VECTOR = new Vector3(0, 0, 0);

const Controls = ({ actions, children, state }: ControlsProps) => {
  const isRunEnabled = useGlobalStore((state) => state.isRunEnabled);
  
  const movementFlags = useKeyboardControls();
  
  const [currentActionIndex, setCurrentActionIndex] = useState<number>(1);
  useEffect(() => {
    Object.values(actions).forEach((action, index) => {
      if (index === currentActionIndex) {
        action?.play?.();
      } else {
        action?.stop?.();
      }
    });
  }, [actions, currentActionIndex]);

  const scene = useThree(({ scene }) => scene);

  const [hasPlacedCharacter, setHasPlacedCharacter] = useState(false);
  const initialFieldPosition = useGlobalStore((state) => state.characterPosition);
  const isTransitioningMap = useGlobalStore((state) => state.isTransitioningMap);
  useEffect(() => {
    const walkmesh = scene.getObjectByName("walkmesh") as Group;

    if (!walkmesh || !initialFieldPosition || isTransitioningMap) {
      return;
    }

    const initialPosition = new Vector3(initialFieldPosition.x, initialFieldPosition.y, initialFieldPosition.z);
    const newPosition = getPositionOnWalkmesh(initialPosition, walkmesh);
    if (newPosition) {
      state.position.set([newPosition.x, newPosition.y, newPosition.z]);
    } else {
      console.warn("Tried to set character position to an invalid position", initialPosition);
    }

    setHasPlacedCharacter(true);
  }, [initialFieldPosition, isTransitioningMap, scene, setHasPlacedCharacter, state.position]);

  useFrame(({ camera, scene }, delta) => {
    const player = scene.getObjectByName("character") as Mesh;
    if (isTransitioningMap || !hasPlacedCharacter) {
      return
    }

    const walkmesh = scene.getObjectByName("walkmesh");

    if (!player || !walkmesh) {
      return;
    }


    direction.copy(ZERO_VECTOR);
    const { forwardVector, rightVector, upVector } = getCameraDirections(camera);
    //console.log(forwardVector, rightVector, upVector)

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
      setCurrentActionIndex(0);
      return;
    }
    
    const isWalking = !isRunEnabled || movementFlags.isWalking;
    direction.normalize().multiplyScalar(isWalking ? WALKING_SPEED : RUNNING_SPEED).multiplyScalar(delta);
    setCurrentActionIndex(isWalking ? 1 : 2);
  
    const desiredPosition = new Vector3().fromArray(state.position.get()).add(direction);

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
    
    const isPermitted = checkForIntersections(player, newPosition, closedDoors);
    
    if (!isPermitted) {
      return;
    }
    
    direction.z = 0;
    direction.normalize();

    let angle = Math.atan2(direction.y, direction.x) - Math.atan2(forwardVector.y, forwardVector.x);
    angle = radToDeg(angle);
    if (angle < 0) {
      angle += 360;
    }
    angle = (angle + 180) % 360;
    angle = (360 - angle) % 360;

    state.angle.set(angle / 360 * 255);

  
    player.userData.hasMoved = true;

    state.position.start([newPosition.x, newPosition.y, newPosition.z], {
      immediate: true,
    });
  });

  return (
    <group name="character">
      {children}
      <Box args={[0.05, CHARACTER_HEIGHT, 0.05]} position={[0,CHARACTER_HEIGHT / 2,0]} name="hitbox" visible={false} />
    </group>
  );
}

export default Controls;