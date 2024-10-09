import { useFrame, useThree } from "@react-three/fiber";
import { Mesh } from "three";
import { Line, Sphere, } from "@react-three/drei";
import { checkForIntersection } from "../gatewayUtils";
import { useState } from "react";

const Gateway = ({
  color,
  gateway,
  onIntersect,
}: {
  color: string,
  gateway: SimpleGateway,
  onIntersect: (gateway: SimpleGateway) => void
}) => {
  const player = useThree(({ scene }) => scene.getObjectByName('character') as Mesh | undefined);

  const [hasExited, setHasExited] = useState(false);
  useFrame(() => {
    if (!player) {
      return;
    }
return;
    const isIntersecting = checkForIntersection(player, gateway);

    if (!isIntersecting && !hasExited) {
      setHasExited(true);
      return;
    }
    if (isIntersecting && hasExited) {
      onIntersect(gateway)
    }
  });

  return (
    <>
    <Line
      points={gateway.sourceLine}
      color={color}
      lineWidth={5}
      transparent
      opacity={import.meta.env.DEV ? 1 : 0}
      />
      <Sphere args={[0.05, 16, 16]} position={gateway.destination} />
      </>
  )
}

export default Gateway;