import { useFrame } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { checkForIntersection } from "../../Gateways/gatewayUtils";
import { Object3D, Vector3 } from "three";

const useLineIntersection = (points: Vector3[] | undefined, mesh: Object3D, isActive = true) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [wasIntersecting, setWasIntersecting] = useState(false);

  useFrame(() => {
    if (!mesh || !points || !isActive) {
      return false;
    }

    const isIntersecting = checkForIntersection(mesh, points);
    setIsIntersecting(isIntersecting);

    if (isIntersecting && !wasIntersecting) {
      setWasIntersecting(true);
    }
  });

  useEffect(() => {
    if (isIntersecting || !wasIntersecting) {
      return;
    }

    setWasIntersecting(false);
  }, [isIntersecting, wasIntersecting]);

  return { isIntersecting, wasIntersecting };
}

export default useLineIntersection;