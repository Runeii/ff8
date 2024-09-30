import { useFrame, useThree } from "@react-three/fiber";
import { DoubleSide, Mesh } from "three";
import { Line, Sphere } from "@react-three/drei";
import type { FormattedGateway } from "../Gateways";
import { checkForIntersection } from "../gatewayUtils";


const GeneratedGateway = ({
  gateway,
  onIntersect,
}: {
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
    <>
      <Sphere args={[0.02, 16, 16]} position={gateway.destinationPoint}>
        <meshBasicMaterial color={0x00ff00} side={DoubleSide} />
      </Sphere>
    <Line
      points={gateway.sourceLine}
      color="blue"
      lineWidth={5}
    />

    </>
  )
}

export default GeneratedGateway;