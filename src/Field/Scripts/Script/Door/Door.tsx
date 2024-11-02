import { useCallback, useMemo, useRef, useState } from "react";
import { Script, ScriptState } from "../../types";
import { FieldData } from "../../../Field";
import { Box } from "@react-three/drei";
import { vectorToFloatingPoint } from "../../../../utils";
import useTriggerEvent from "../useTriggerEvent";
import { useFrame, useThree } from "@react-three/fiber";
import { Euler, Mesh, Quaternion, Vector3 } from "three";
import useMeshIntersection from "../useMeshIntersection";

type DoorProps = {
  doors: FieldData['doors'];
  script: Script;
  setActiveMethodId: (methodId: string) => void;
  state: ScriptState;
}

const Door = ({ doors, script, setActiveMethodId, state }: DoorProps) => {
  const [isDoorOpen, setIsDoorOpen] = useState(false);

  const door = useMemo(() => {
    // Feels hacky, but seems to work?
    const doorId = parseInt(script.name.toLowerCase().replace('door', '')) - 1
    const entry = doors.find(door => door.doorID === doorId)!
    return entry;
  }, [doors, script.name]);

  const box = useMemo(() => {
    if (!door) {
      return null;
    }
    const [startPoint, endPoint] = door.line.map(vectorToFloatingPoint);
    const midpoint = new Vector3().addVectors(startPoint, endPoint).multiplyScalar(0.5);
    const direction = new Vector3().subVectors(endPoint, startPoint);
    const length = direction.length();
    direction.normalize(); 
    const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction);

    const hitboxDepth = 0.09;
    const hitboxMidpoint = midpoint.clone();
    hitboxMidpoint.x += hitboxDepth / 4;
    return {
      midpoint,
      hitboxMidpoint,
      hitboxDepth,
      rotation: new Euler().setFromQuaternion(quaternion),
      length,
    }
  }, [door]);

  const playerHitbox = useThree(({ scene }) => scene.getObjectByName('hitbox') as Mesh);
  const hitboxRef = useRef<Mesh>(null);
  const { isIntersecting } = useMeshIntersection(playerHitbox, hitboxRef.current!, state.isDoorOn);

  const setDoorOpenState = useCallback((isOpen: boolean) => {
    return (methodId: string) => {
      setIsDoorOpen(isOpen);
      setActiveMethodId(methodId);
    }
  }, [setActiveMethodId]);

  let playerPosition = playerHitbox.getWorldPosition(new Vector3());
  const [isNearDoor, setIsNearDoor] = useState(false);
  useFrame(() => {
    if (!box) {
      return;
    }
    playerPosition = playerHitbox.getWorldPosition(playerPosition);
    const doorPosition = box.hitboxMidpoint;
    const distanceFromDoor = playerPosition.distanceTo(doorPosition);
    setIsNearDoor(distanceFromDoor < 0.1);
  });
  useTriggerEvent('open', script, setDoorOpenState(true), isIntersecting && !isDoorOpen);
  useTriggerEvent('close', script, setDoorOpenState(false), !isNearDoor && isDoorOpen);

  const linePoints = useMemo(() => door?.line, [door]);

  if (!linePoints || !state.isDoorOn || !box) {
    return null;
  }

  return (
    <>
      <Box
        args={[0.001, box.length, 0.1]}
        name={isDoorOpen ? 'door-open' : 'door-closed'}
        position={box.midpoint}
        rotation={box.rotation}
        visible={false}
        >
        <meshBasicMaterial color={isDoorOpen ? 'green' : 'red'} opacity={1} transparent />
      </Box>
        <Box
          args={[0.03, box.length, 0.1]} 
          position={box.midpoint}
          rotation={box.rotation}
          ref={hitboxRef}
          visible={false}
          >
          <meshBasicMaterial color="blue" opacity={1} transparent />
        </Box>
    </>
  );
}

export default Door;