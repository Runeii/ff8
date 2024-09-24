import {  Mesh, Vector3 } from "three"
import { getPositionOnWalkmesh, vectorToFloatingPoint } from "../../utils"
import { useCallback, useEffect, useMemo, useState } from "react"
import { FieldData } from "../Field"
import Gateway from "./Gateway/Gateway"
import { useThree } from "@react-three/fiber"
import { CHARACTER_HEIGHT } from "../../Character/Character"
import { checkForIntersection } from "./gatewayUtils"
import gatewaysMapping from '../../gateways';

const gateways = gatewaysMapping as unknown as Record<FieldData['id'], typeof gatewaysMapping.bghall_5>

type GatewaysProps = {
  fieldId: FieldData['id']
  setCharacterPosition: (position: Vector3) => void
  setField: (fieldId: string) => void
}

export type FormattedGateway = Omit<FieldData['gateways'][number], 'sourceLine'> & {
  sourceLine: Vector3[]
}


function rotateAroundPoint(point, center, angle) {
  const translatedPoint = new Vector3().subVectors(point, center);
  const rotatedPoint = new Vector3(
    translatedPoint.x * Math.cos(angle) - translatedPoint.z * Math.sin(angle),
    translatedPoint.y,  // Keep y-axis unchanged
    translatedPoint.x * Math.sin(angle) + translatedPoint.z * Math.cos(angle)
  );
  return rotatedPoint.add(center);
}

const Gateways = ({ fieldId, setCharacterPosition, setField }: GatewaysProps) => {
  const [hasActiveGateways, setHasActiveGateways] = useState(false);

  const walkmesh = useThree(({ scene }) => scene.getObjectByName('walkmesh') as Mesh);

  const formattedGateways:  FormattedGateway[] = useMemo(() => {
    const exits = gateways[fieldId].exits.map(exit => {
      const {
        destinationPoint: originalDestinationPoint,
        sourceLine: originalSourceLine
        } = exit;

        const sourceLine = originalSourceLine.map(vectorToFloatingPoint)
        const midpoint = new Vector3();
        midpoint.addVectors(sourceLine[0], sourceLine[1]).divideScalar(2);
        const walkmeshZ = getPositionOnWalkmesh(midpoint, walkmesh);
        if (walkmeshZ) {
          walkmeshZ.z += CHARACTER_HEIGHT / 2;
          sourceLine[0].z = walkmeshZ.z;
          sourceLine[1].z = walkmeshZ.z;
        }

        return {
          ...exit,
          destinationPoint: vectorToFloatingPoint(originalDestinationPoint),
          sourceLine,
        }
    });

    const entrances = gateways[fieldId].entrances.map(entrance => {
      const {
          destinationPoint: originalDestinationPoint,
          sourceLine: originalSourceLine
        } = entrance;

      const destinationPoint = vectorToFloatingPoint(originalDestinationPoint);
      const walkmeshZ = getPositionOnWalkmesh(destinationPoint, walkmesh);
      if (walkmeshZ) {
        walkmeshZ.z += CHARACTER_HEIGHT / 2;
        destinationPoint.z = walkmeshZ.z;
      }
    
      const sourceLine = originalSourceLine.map(vectorToFloatingPoint);

      const newDestinationPoint = new Vector3().addVectors(sourceLine[0], sourceLine[1]).multiplyScalar(0.5);
      
    
      const direction1 = new Vector3().subVectors(destinationPoint, sourceLine[0]);
      const direction2 = new Vector3().subVectors(destinationPoint, sourceLine[1]);

      const angle = 0;

      const oppositePoint1 = new Vector3().addVectors(destinationPoint, direction1);
      const oppositePoint2 = new Vector3().addVectors(destinationPoint, direction2);
      
      const rotatedPoint1 = rotateAroundPoint(oppositePoint1, destinationPoint, angle);
      const rotatedPoint2 = rotateAroundPoint(oppositePoint2, destinationPoint, angle);
      
      return {
        ...entrance,
        destinationPoint: newDestinationPoint,
        sourceLine: [rotatedPoint1, rotatedPoint2],
        target: entrance.source,
      }
    });

    return [
      ...exits,
    ];
  }, [fieldId, walkmesh]);


  const handleTransition = useCallback((gateway: FieldData["gateways"][number]) => {
    if (!hasActiveGateways) {
      return;
    }

    console.log('Transitioning to', gateway.target, 'via gateway', gateway.id, gateway);
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