import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Group, Vector3 } from "three";

const useCalculatePlayerDepth = () => {

  const playerDepthRef = useRef<number>(0);

  useFrame(({ camera, scene }) => {
    const player = scene.getObjectByName("character") as Group;

    if (!player) {
      return;
    }

    const toTarget = new Vector3();
    player.getWorldPosition(toTarget);
    toTarget.sub(camera.position);

    const distanceInDirection = toTarget.dot(camera.userData.initialDirection);
    playerDepthRef.current = distanceInDirection;
  });

  return playerDepthRef;
}

export default useCalculatePlayerDepth;