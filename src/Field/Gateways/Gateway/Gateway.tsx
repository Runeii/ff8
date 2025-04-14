import { Line } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import { vectorToFloatingPoint } from "../../../utils";
import { FieldData } from "../../Field";
import useGlobalStore from "../../../store";
import useLineIntersection from "../../Scripts/Script/useLineIntersection";

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

  const isMapJumpEnabled = useGlobalStore((state) => state.isMapJumpEnabled);

  useLineIntersection(formattedGateway.sourceLine, isMapJumpEnabled, {
    onAcross: () => onIntersect(formattedGateway),
  });

  const isDebugMode = useGlobalStore(state => state.isDebugMode);

  return (
    <>
      <Line
        points={formattedGateway.sourceLine}
        color={color}
        lineWidth={5}
        transparent
        opacity={1}
        visible={isDebugMode}
      />
    </>
  )
}

export default Gateway;