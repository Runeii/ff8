import {  useCallback, useMemo } from "react"
import Gateway from "./Gateway/Gateway"
import useGlobalStore from '../../store';
import generatedGateways from '../../gateways.ts';

export type GatewaysProps = {
  fieldId: string,
}

const Gateways = ({ fieldId }: GatewaysProps) => {
  const isTransitioningMap = useGlobalStore(state => state.isTransitioningMap);

  const handleTransition = useCallback((gateway: FormattedGateway) => {
    if (isTransitioningMap) {
      return;
    }
    console.log('Transitioning to', gateway.target, 'via gateway', gateway, 'at', gateway.destination);
    useGlobalStore.setState({
      fieldId: gateway.target,
      isTransitioningMap: true,
      pendingCharacterPosition: gateway.destination
    });
  }, [isTransitioningMap]);

  const gateways = useMemo(() => {
    return generatedGateways.filter((gateway) => gateway.source === fieldId) as unknown as Gateway[];
  }, [fieldId]);
  
  if (isTransitioningMap) {
    return null;
  }

  return (
    <>
      {gateways.map(gateway => ( 
        <Gateway color="green" key={gateway.id} gateway={gateway} onIntersect={handleTransition} />
      ))}
    </>
  )
}

export default Gateways;