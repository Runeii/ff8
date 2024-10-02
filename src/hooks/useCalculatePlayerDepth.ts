import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { Mesh, Vector3 } from "three";

const useCalculatePlayerDepth = () => {
  const player = useThree(({ scene }) => scene.getObjectByName('character') as Mesh);

  const playerDepthRef = useRef<number>(0);

  useFrame(({ camera }) => {
    if (!player) {
      return;
    }

    const toTarget = new Vector3();
    toTarget.subVectors(player.position, camera.position);
    const distanceInDirection = toTarget.dot(camera.userData.initialDirection);
    playerDepthRef.current = distanceInDirection;
  });

  return playerDepthRef;
}

export default useCalculatePlayerDepth;