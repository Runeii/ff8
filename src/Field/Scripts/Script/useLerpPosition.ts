import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import { Vector3 } from "three";

const useLerpPosition = (targetArray: number[], speed: number) => {
  const [currentPosition, setCurrentPosition] = useState<Vector3>();

  const targetRef = useRef(new Vector3());
  useFrame((_, delta) => {
    const [x, y, z] = targetArray;
    targetRef.current.set(x, y, z);
    const target = targetRef.current;

    if (!currentPosition || speed === 0) {
      setCurrentPosition(target.clone());
      return;
    }

    if (currentPosition.equals(target)) {
      return;
    }

    const currentPositionClone = currentPosition.clone();
    const distance = speed * delta;
    currentPositionClone.lerp(target, distance / currentPositionClone.distanceTo(target));

    if (currentPositionClone.distanceTo(target) < 0.01) {
      currentPositionClone.copy(target);
    }

    setCurrentPosition(currentPositionClone);
  });


  return currentPosition;
}

export default useLerpPosition;