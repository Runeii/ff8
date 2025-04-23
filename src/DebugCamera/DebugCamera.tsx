import { PerspectiveCamera } from "@react-three/drei";
import { PerspectiveCamera as PerspectiveCameraThree } from "three";
import useGlobalStore from "../store";
import { useEffect, useRef } from "react";

const DebugCamera = () => {
  const isDebugMode = useGlobalStore(state => state.isDebugMode);

  const cameraRef = useRef<PerspectiveCameraThree>(null);
  useEffect(() => {
    if (!isDebugMode) {
      return;
    }

  }, [isDebugMode]);
  return (
    <PerspectiveCamera 
    makeDefault={isDebugMode}
    ref={cameraRef}
    name="debugCamera"
    position={[0, 0, 0]}
    fov={75}
    near={0.1}
    far={1000}
    />
  );
}

export default DebugCamera;