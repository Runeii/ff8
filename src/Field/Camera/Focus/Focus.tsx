import { Sphere } from "@react-three/drei";
import useGlobalStore from "../../../store";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { Group, Mesh, Object3D, Vector3 } from "three";
import { getPartyMemberModelComponent } from "../../Scripts/Script/Model/modelUtils";

const START_FOCUS_VECTOR = new Vector3(0, 0, 0);
const END_FOCUS_VECTOR = new Vector3(0, 0, 0);

const Focus = () => {
  const focusRef = useRef<Mesh>(null);

  const cameraFocusObject = useGlobalStore(state => state.cameraFocusObject);
  const cameraFocusSpring = useGlobalStore(state => state.cameraFocusSpring);

  const [currentFocusObject, setCurrentFocusObject] = useState<Object3D | null>(null);
  const [targetFocusObject, setTargetFocusObject] = useState<Object3D | null>(null);

  const scene = useThree(state => state.scene);

  useFrame(() => {
    if (currentFocusObject) {
      return;
    }

    const player = getPartyMemberModelComponent(scene, 0);
    const targetMesh = player?.getObjectByName("model") as Group;
    if (!targetMesh) {
      console.log('No player model found for focus');
      return;
    }
    
    setCurrentFocusObject(targetMesh);
    setTargetFocusObject(targetMesh);
    console.log('Set defaults. Current:', targetMesh, ' Target:', targetMesh)
  });

  useEffect(() => {
    if (!cameraFocusObject || !cameraFocusSpring) {
      return;
    }

    const targetMesh = cameraFocusObject.getObjectByName("model") as Group;
    if (!targetMesh) {
      console.log('Bad camera focus, no inner model!');
      return;
    }

    if (targetMesh === targetFocusObject) {
      return;
    }

    setTargetFocusObject(currentValue => {
      setCurrentFocusObject(currentValue);
      return targetMesh;
    });
    console.log('updated target focus', targetMesh, ' from ', cameraFocusObject);
    cameraFocusSpring.set(0);
    cameraFocusSpring.start(1, 16);
  }, [cameraFocusObject, cameraFocusSpring, targetFocusObject]);

  useFrame(() => {
    if (!focusRef.current) {
      return;
    }

    if (!currentFocusObject) {
      console.log('No current focus object');
      return;
    }

    const startFocusPosition = currentFocusObject.getWorldPosition(START_FOCUS_VECTOR);
    startFocusPosition.z = currentFocusObject.userData.focusZPosition;

    if (currentFocusObject === targetFocusObject) {
      console.log('Focus is on target already', currentFocusObject.id, targetFocusObject.id);
    }
    if (!targetFocusObject || currentFocusObject === targetFocusObject || !cameraFocusSpring) {
      focusRef.current.position.copy(startFocusPosition);
      return;
    }

    const springValue = cameraFocusSpring.get();

    const endFocusPosition = targetFocusObject.getWorldPosition(END_FOCUS_VECTOR);
    endFocusPosition.z = targetFocusObject.userData.focusZPosition;

    focusRef.current.position.lerpVectors(
      startFocusPosition,
      endFocusPosition,
      springValue
    );
  });

  const isDebugMode = useGlobalStore((state) => state.isDebugMode);

  return (
    <Sphere args={[0.01, 32, 32]} name="focus" position={[0,0,0]} ref={focusRef}>
      <meshBasicMaterial color="pink" transparent opacity={0.8} visible={isDebugMode} />
    </Sphere>
  )
}

export default Focus;