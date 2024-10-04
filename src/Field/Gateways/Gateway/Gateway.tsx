import { useFrame, useThree } from "@react-three/fiber";
import { Mesh } from "three";
import { Line } from "@react-three/drei";
import type { FormattedGateway } from "../Gateways";
import { checkForIntersection } from "../gatewayUtils";

const Gateway = ({
  color,
  gateway,
  onIntersect,
}: {
  color: string,
  gateway: FormattedGateway,
  onIntersect: (gateway: FormattedGateway) => void
}) => {
  const player = useThree(({ scene }) => scene.getObjectByName('character') as Mesh | undefined);

  useFrame(() => {
    if (!player) {
      return;
    }

    if (checkForIntersection(player, gateway)) {        
      onIntersect(gateway)
    }
  });

  return (
    <Line
      points={gateway.sourceLine}
      color={color}
      lineWidth={5}
      transparent
      opacity={import.meta.env.DEV ? 1 : 0}
    />
  )
}

export default Gateway;