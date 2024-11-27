import {  useCallback, useMemo } from "react"
import Gateway from "./Gateway/Gateway"
import useGlobalStore from '../../store';
import generatedGateways from '../../gateways.ts';
import MAP_NAMES from "../../constants/maps.ts";

export type GatewaysProps = {
  fieldId: string,
}

const Gateways = ({ fieldId }: GatewaysProps) => {
  const isTransitioningMap = useGlobalStore(state => !!state.pendingFieldId);

  const handleTransition = useCallback((gateway: FormattedGateway) => {
    if (isTransitioningMap) {
      return;
    }

    if (gateway.target.startsWith('wm')) {
      console.log('Transitioning to world map', gateway.target);
      useGlobalStore.setState({
        pendingFieldId: 'wm00',
      });
      return
    }

    console.log('Transitioning to', gateway.target, 'via gateway', gateway, 'at', gateway.destination);
    useGlobalStore.setState({
      pendingFieldId: gateway.target as typeof MAP_NAMES[number],
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