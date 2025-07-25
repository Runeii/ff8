import { Sphere } from "@react-three/drei";
import useGlobalStore from "../../../store";
import { useFrame } from "@react-three/fiber";
import {  useRef, useState } from "react";
import { Box3, Mesh, Vector3 } from "three";
import { getPartyMemberModelComponent } from "../../Scripts/Script/Model/modelUtils";

const FOCUS_VECTOR = new Vector3(0, 0, 0);

const Focus = () => {
  const isDebugMode = useGlobalStore((state) => state.isDebugMode);

  const focusRef = useRef<Mesh>(null);

  const { cameraFocusObject, cameraFocusSpring } = useGlobalStore();

  const [playerBoundingBox] = useState<Box3>(new Box3());
  useFrame(({scene}) => {
    const playerMesh = getPartyMemberModelComponent(scene, 0) as Mesh;
    if (!playerMesh) {
      return;
    }

    playerMesh.updateWorldMatrix(true, false);
    playerBoundingBox.setFromObject(playerMesh);
  });

  useFrame(({scene}) => {
    if (!focusRef.current) {
      return;
    }

    const targetMesh = cameraFocusObject ?? getPartyMemberModelComponent(scene, 0);

    if (!targetMesh) {
      return;
    }

    const height = playerBoundingBox.max.z - playerBoundingBox.min.z;
    const characterPosition = targetMesh.getWorldPosition(FOCUS_VECTOR);
    characterPosition.z = (height / 256) * useGlobalStore.getState().cameraFocusHeight;

    if (!cameraFocusSpring) {
      focusRef.current.position.copy(characterPosition);
      return
    }
    
    focusRef.current.position.lerp(
      characterPosition,
      cameraFocusSpring.get()
    );
  });

  return (
    <Sphere args={[0.01, 32, 32]} name="focus" position={[0,0,0]} ref={focusRef}>
      <meshBasicMaterial color="pink" transparent opacity={0.8} visible={isDebugMode} />
    </Sphere>
  )
}

export default Focus;