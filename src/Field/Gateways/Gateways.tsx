import { BufferGeometry } from "three"
import {  useCallback, useMemo } from "react"
import Gateway from "./Gateway/Gateway"
import useGlobalStore from '../../store';
import generatedGateways from '../../gateways.ts';

export type GatewaysProps = {
  fieldId: string,
  walkMeshGeometry: BufferGeometry[]
}

const Gateways = ({ fieldId }: GatewaysProps) => {
  const handleTransition = useCallback((gateway: FormattedGateway) => {
    console.log('Transitioning to', gateway.target, 'via gateway', gateway, 'at', gateway.destination);
    useGlobalStore.setState({
      fieldId: gateway.target,
      pendingCharacterPosition: gateway.destination
    });
  }, []);

  const gateways = useMemo(() => {
    return generatedGateways.filter((gateway) => gateway.source === fieldId) as unknown as Gateway[];
  }, [fieldId]);
  
  return (
    <>
      {gateways.map(gateway => ( 
        <Gateway color="green" key={gateway.id} gateway={gateway} onIntersect={handleTransition} />
      ))}
    </>
  )
}

export default Gateways;