import { useFrame } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { checkForIntersectingMeshes } from "../../Gateways/gatewayUtils";
import { Mesh } from "three";

const useMeshIntersection = (mesh: Mesh, mesh2: Mesh, isActive = true) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [wasIntersecting, setWasIntersecting] = useState(false);

  useFrame(() => {
    if (!mesh || !mesh2 || !isActive) {
      return false;
    }

    const isIntersecting = checkForIntersectingMeshes(mesh, mesh2);
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

export default useMeshIntersection;