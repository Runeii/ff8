import { useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { checkForIntersection } from "../gatewayUtils";
import { useMemo, useState } from "react";
import { vectorToFloatingPoint } from "../../../utils";
import { FieldData } from "../../Field";
import useGlobalStore from "../../../store";

const Gateway = ({
  color,
  gateway,
  onIntersect,
}: {
  color: string,
  gateway: FieldData['gateways'][0],
  onIntersect: (gateway: FormattedGateway) => void
}) => {
  const formattedGateway: FormattedGateway = useMemo(() => {
    return {
      destination: vectorToFloatingPoint(gateway.destinationPoint),
      sourceLine: gateway.sourceLine.map(vectorToFloatingPoint),
      target: gateway.target,
    }
  }, [gateway]);

  const [hasExited, setHasExited] = useState(false);
  const isMapJumpEnabled = useGlobalStore((state) => state.isMapJumpEnabled);
  useFrame(({ scene }) => {
    const player = scene.getObjectByName("character");

    if (!player || !player.userData.hasMoved || !isMapJumpEnabled) {
      return;
    }
  
    const isIntersecting = checkForIntersection(player, formattedGateway.sourceLine);

    if (!isIntersecting) {
      setHasExited(true);
    }
  
    if (isIntersecting && !hasExited) {
      return;
    }
  
    if (isIntersecting) {
      onIntersect(formattedGateway)
    }
  });

  return (
    <>
      <Line
        points={formattedGateway.sourceLine}
        color={color}
        lineWidth={5}
        transparent
        opacity={import.meta.env.DEV ? 1 : 0}
      />
    </>
  )
}

export default Gateway;