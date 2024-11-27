import { useFrame } from "@react-three/fiber";
import { useMemo, useState } from "react";
import { checkForIntersection } from "../../Gateways/gatewayUtils";
import { Object3D, Vector3 } from "three";

const useLineIntersection = (points: Vector3[] | undefined, isActive = true) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [wasIntersecting, setWasIntersecting] = useState(false);
  const [hasEverExited, setHasEverExited] = useState(false);

  useFrame(({ scene }) => {
    const mesh = scene.getObjectByName("character") as Object3D;

    if (!mesh || !points || !isActive) {
      return false;
    }

    const isIntersecting = checkForIntersection(mesh, points);

    if (isIntersecting) {
      setIsIntersecting(isIntersecting);
      setWasIntersecting(true);
      return;
    }

    if (!isIntersecting) {
      setHasEverExited(true);
    }

    if (wasIntersecting) {
      setIsIntersecting(false);
      window.requestAnimationFrame(() => {
        setWasIntersecting(false);
      });
    }
  });

  return useMemo(() => ({
    hasEverExited,
    isIntersecting,
    wasIntersecting,
  }), [hasEverExited, isIntersecting, wasIntersecting]);
}

export default useLineIntersection;