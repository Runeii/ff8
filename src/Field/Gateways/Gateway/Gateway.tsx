import { useFrame, useThree } from "@react-three/fiber";
import { Mesh } from "three";
import { Line } from "@react-three/drei";
import type { FormattedGateway } from "../Gateways";
import { checkForIntersection } from "../gatewayUtils";


const Gateway = ({
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
      player.userData.hasBeenPlacedInScene = false;
    }
  });

  return (
    <Line
      points={gateway.sourceLine}
      color="green"
      lineWidth={5}
      onClick={() => onIntersect(gateway)}
      
    />
  )
}

export default Gateway;