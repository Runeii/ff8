import {  Mesh, Vector3 } from "three"
import { getPositionOnWalkmesh, vectorToFloatingPoint } from "../../utils"
import { useCallback, useEffect, useMemo, useState } from "react"
import { FieldData } from "../Field"
import Gateway from "./Gateway/Gateway"
import { useThree } from "@react-three/fiber"
import { CHARACTER_HEIGHT } from "../../Character/Character"
import { checkForIntersection } from "./gatewayUtils"

type GatewaysProps = {
  gateways: FieldData['gateways']
  setCharacterPosition: (position: Vector3) => void
  setField: (fieldId: string) => void
}

export type FormattedGateway = Omit<FieldData['gateways'][number], 'sourceLine'> & {
  sourceLine: Vector3[]
}

const Gateways = ({ gateways, setCharacterPosition, setField }: GatewaysProps) => {
  const [hasActiveGateways, setHasActiveGateways] = useState(false);

  const walkmesh = useThree(({ scene }) => scene.getObjectByName('walkmesh') as Mesh);

  const formattedGateways:  FormattedGateway[] = useMemo(() => gateways.map(gateway => {
    const { sourceLine, ...rest } = gateway;

    const lineVectors = sourceLine.map((point) => vectorToFloatingPoint(point));
    const midpoint = new Vector3();
    midpoint.addVectors(lineVectors[0], lineVectors[1]).divideScalar(2);
    const walkmeshZ = getPositionOnWalkmesh(midpoint, walkmesh);
    if (walkmeshZ) {
      walkmeshZ.z += CHARACTER_HEIGHT / 2;
      lineVectors[0].z = walkmeshZ.z;
      lineVectors[1].z = walkmeshZ.z;
    }
    return {
      ...rest,
      sourceLine: lineVectors,
    }
  }), [gateways, walkmesh]);


  const handleTransition = useCallback((gateway: FieldData["gateways"][number]) => {
    console.log('Transitioning to', gateway.target, 'via gateway', gateway.id);
    if (!hasActiveGateways) {
      console.log('But gateways are inactive')
      return;
    }
    setField(gateway.target);
    setCharacterPosition(vectorToFloatingPoint(gateway.destinationPoint));
  }, [hasActiveGateways, setField, setCharacterPosition]);
  

  useEffect(() => {
    setHasActiveGateways(false);
  }, [gateways, setHasActiveGateways]);

  const player = useThree(({ scene }) => scene.getObjectByName('character') as Mesh);

  useEffect(() => {
    if (hasActiveGateways) {
      return;
    }

    const onKeyDown = () => {
      const isIntersectingAnyGateways = formattedGateways.some((gateway) => checkForIntersection(player, gateway));
      if (!isIntersectingAnyGateways) {
        setHasActiveGateways(true);
      }
    }
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    }
  }, [formattedGateways, hasActiveGateways, player]);

  return (
    <>
      {formattedGateways.map(gateway => ( 
        <Gateway key={gateway.id} gateway={gateway} onIntersect={handleTransition} />
      ))}
    </>
  )
}

export default Gateways;