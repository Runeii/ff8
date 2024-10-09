import { BufferGeometry, Mesh, Vector3 } from "three"
import {  useCallback, useMemo } from "react"
import { FieldData } from "../Field"
import { formatEntrance, formatExit, formatGateway } from "./gatewayUtils"
import gatewaysMapping from '../../gateways';
import Gateway from "./Gateway/Gateway"
import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";

const gateways = gatewaysMapping as unknown as GeneratedGateway[]

export type GatewaysProps = {
  fieldId: FieldData['id']
  setCharacterPosition: (position: Vector3) => void
  setField: (fieldId: string) => void
  walkMeshGeometry: BufferGeometry[]
}

const Gateways = ({ fieldId, setCharacterPosition, setField }: GatewaysProps) => {
  const walkmesh = useThree(({ scene }) => scene.getObjectByName('walkmesh') as Mesh);

  const formattedGateways:  SimpleGateway[] = useMemo(() => {
    const exits = gateways.filter(gateway => gateway.source === fieldId).map(gateway => formatGateway(gateway, walkmesh)).map(formatExit);
    return [...exits]
  }, [fieldId, walkmesh]);

  const handleTransition = useCallback((gateway: SimpleGateway) => {
    console.log('Transitioning to', gateway.target, 'via gateway', gateway, 'at', gateway.destination);
    setField(gateway.target);
    setCharacterPosition(gateway.destination);
  }, [setField, setCharacterPosition]);
  
  return (
    <>
      {formattedGateways.map(gateway => ( 
        <Gateway color="green" key={gateway.id} gateway={gateway} onIntersect={handleTransition} />
      ))}
    </>
  )
}

export default Gateways;