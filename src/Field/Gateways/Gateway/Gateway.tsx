import { useMemo, useRef } from "react";
import { vectorToFloatingPoint } from "../../../utils";
import { FieldData } from "../../Field";
import useGlobalStore from "../../../store";
import LineBlock from "../../LineBlock/LineBlock";
import useIntersection from "../../Scripts/Script/useIntersection";
import { Mesh } from "three";

const Gateway = ({
  gateway,
  onIntersect,
}: {
  gateway: FieldData['gateways'][0],
  onIntersect: (gateway: FormattedGateway) => void
}) => {
  const lineRef = useRef<Mesh>(null);
  const formattedGateway: FormattedGateway = useMemo(() => {
    return {
      destination: vectorToFloatingPoint(gateway.destinationPoint),
      sourceLine: gateway.sourceLine.map(vectorToFloatingPoint),
      target: gateway.target,
    }
  }, [gateway]);

  const isMapJumpEnabled = useGlobalStore((state) => state.isMapJumpEnabled);

  useIntersection(lineRef.current, isMapJumpEnabled, {
    onTouchOn: () => onIntersect(formattedGateway),
  }, formattedGateway.sourceLine);

  return (
    <LineBlock
      color={isMapJumpEnabled ? 'yellow' : 'black'}
      lineBlockRef={lineRef}
      points={formattedGateway.sourceLine}
      renderOrder={0}
    />
  );
}

export default Gateway;