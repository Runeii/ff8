import {  Group, Mesh, Raycaster, Vector3 } from "three"
import { vectorToFloatingPoint } from "../../utils"
import {  useCallback, useEffect, useMemo, useState } from "react"
import { FieldData } from "../Field"
import Gateway from "./Gateway/Gateway"
import GeneratedGateway from "./GeneratedGateway/GeneratedGateway"
import { useThree } from "@react-three/fiber"
import { checkForIntersection, findShortestLineForPointOnMesh } from "./gatewayUtils"
import gatewaysMapping from '../../gateways';
import { CHARACTER_HEIGHT } from "../../Character/Character"

const gateways = gatewaysMapping as unknown as Record<FieldData['id'], typeof gatewaysMapping.bghall_5>

type GatewaysProps = {
  fieldId: FieldData['id']
  setCharacterPosition: (position: Vector3) => void
  setField: (fieldId: string) => void
}

export type FormattedGateway = Omit<FieldData['gateways'][number], 'sourceLine' | 'destinationPoint'> & {
  sourceLine: Vector3[]
  destinationPoint: Vector3
}

const Gateways = ({ fieldId, setCharacterPosition, setField, walkMeshGeometry }: GatewaysProps) => {
  const formattedGateways:  FormattedGateway[] = useMemo(() => {
    const {exits} = gateways[fieldId];

    return exits.map(exit => {
      const {
        destinationPoint: originalDestinationPoint,
        sourceLine: originalSourceLine
        } = exit;

        const sourceLine = originalSourceLine.map(vectorToFloatingPoint);
        
        sourceLine[0].z += CHARACTER_HEIGHT / 2;
        sourceLine[1].z += CHARACTER_HEIGHT / 2;
        return {
          ...exit,
          destinationPoint: vectorToFloatingPoint(originalDestinationPoint),
          sourceLine,
        }
    });
  }, [fieldId]);

  const walkmesh = useThree(({ scene }) => scene.getObjectByName('walkmesh') as Group);
  const formattedEntrances: FormattedGateway[] = useMemo(() => {
    const { entrances } = gateways[fieldId];

    return entrances.map(entrance => {
      const {
        destinationPoint: originalDestinationPoint,
        sourceLine
      } = entrance;

      const destinationPoint = vectorToFloatingPoint(originalDestinationPoint);
      const { x, y } = destinationPoint;
      const origin = new Vector3(x, y, 1000);
      const direction = new Vector3(0, 0, -1);
      direction.normalize();
      const raycaster = new Raycaster(origin, direction);
      const intersects = raycaster.intersectObject(walkmesh);

      if (intersects.length === 0) {
        console.log("Bad gateway, no intersection found at x,y point on the mesh.");
      }

      const intersectionPoint = intersects[0].point;
      const z = intersectionPoint.z; 
      destinationPoint.z = z

      const line = findShortestLineForPointOnMesh(walkMeshGeometry, destinationPoint);
      return {
        ...entrance,
        destinationPoint: destinationPoint, 
        sourceLine: line
      }
    });
  }, [fieldId, walkmesh,walkMeshGeometry]);

  const handleTransition = useCallback((gateway: FieldData["gateways"][number]) => {

    console.log('Transitioning to', gateway.target, 'via gateway', gateway.id, gateway);
    setField(gateway.target);
    setCharacterPosition(vectorToFloatingPoint(gateway.destinationPoint));
  }, [setField, setCharacterPosition]);
  

  return (
    <>
      {formattedGateways.map(gateway => ( 
        <Gateway key={gateway.id} gateway={gateway} onIntersect={handleTransition} />
      ))}
      {formattedEntrances.map(entrance => (
        <GeneratedGateway key={entrance.id} gateway={entrance} onIntersect={handleTransition} />
      ))}
    </>
  )
}

export default Gateways;