import { BufferGeometry } from "three"
import {  useCallback } from "react"
import { FieldData } from "../Field"
import Gateway from "./Gateway/Gateway"
import useGlobalStore from '../../store';

export type GatewaysProps = {
  gateways: FieldData['gateways']
  walkMeshGeometry: BufferGeometry[]
}

const Gateways = ({ gateways }: GatewaysProps) => {
  const handleTransition = useCallback((gateway: FormattedGateway) => {
    console.log('Transitioning to', gateway.target, 'via gateway', gateway, 'at', gateway.destination);
    useGlobalStore.setState({
      fieldId: gateway.target,
      pendingCharacterPosition: gateway.destination
    });
  }, []);
  
  return (
    <>
      {gateways.map(gateway => ( 
        <Gateway color="green" key={`${gateway.destinationPoint.x}-${gateway.destinationPoint.y}-${gateway.destinationPoint.z}`} gateway={gateway} onIntersect={handleTransition} />
      ))}
    </>
  )
}

export default Gateways;