import { useFrame, useThree } from "@react-three/fiber";
import { Mesh } from "three";
import { Line } from "@react-three/drei";
import type { FormattedGateway } from "../Gateways";
import { checkForIntersection } from "../gatewayUtils";
import { useState } from "react";

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
    />
  )
}

export default Gateway;