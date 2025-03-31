import { Sphere } from "@react-three/drei";
import useGlobalStore from "../../../store";
import { useFrame } from "@react-three/fiber";
import {  useRef } from "react";
import { Mesh, Vector3 } from "three";
import { getPartyMemberModelComponent } from "../../Scripts/Script/Model/modelUtils";

const FOCUS_VECTOR = new Vector3(0, 0, 0);

const Focus = () => {
  const isDebugMode = useGlobalStore((state) => state.isDebugMode);

  const focusRef = useRef<Mesh>(null);

  const { cameraFocusObject, cameraFocusSpring } = useGlobalStore();

  useFrame(({scene}) => {
    if (!focusRef.current) {
      return;
    }

    const targetMesh = cameraFocusObject ?? getPartyMemberModelComponent(scene, 0);

    if (!targetMesh) {
      return;
    }

    focusRef.current.position.lerp(
      targetMesh.getWorldPosition(FOCUS_VECTOR),
      cameraFocusSpring.get()
    );
  });

  return (
    <Sphere args={[0.03, 32, 32]} name="focus" position={[0,0,0]} ref={focusRef}>
      <meshBasicMaterial color="pink" transparent opacity={0.8} visible={isDebugMode} />
    </Sphere>
  )
}

export default Focus;