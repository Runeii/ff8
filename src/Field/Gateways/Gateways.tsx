import {  Group, Mesh, Raycaster, Vector3 } from "three"
import { getPositionOnWalkmesh, vectorToFloatingPoint } from "../../utils"
import {  useCallback, useEffect, useMemo, useState } from "react"
import { FieldData } from "../Field"
import Gateway from "./Gateway/Gateway"
import { useThree } from "@react-three/fiber"
import { adjustSourceLineZOffset, checkForIntersection, findShortestLineForPointOnMesh } from "./gatewayUtils"
import gatewaysMapping from '../../gateways';
import { CHARACTER_HEIGHT } from "../../Character/Character"

const gateways = gatewaysMapping as unknown as Record<FieldData['id'], typeof gatewaysMapping.bghall_5>

type GatewaysProps = {
  fieldId: FieldData['id']
  setCharacterPosition: (position: Vector3) => void
  setField: (fieldId: string) => void
}

export type FormattedGateway = {
  id: string;
  target: string;
  sourceLine: Vector3[]
  destinationPoint: Vector3
}

const Gateways = ({ fieldId, setCharacterPosition, setField, walkMeshGeometry }: GatewaysProps) => {
  const walkmesh = useThree(({ scene }) => scene.getObjectByName('walkmesh') as Group);

  const formattedExits:  FormattedGateway[] = useMemo(() => {
    const {exits} = gateways[fieldId];

    return exits.map(exit => {
      const {
        destinationPoint: originalDestinationPoint,
        sourceLine: originalSourceLine
        } = exit;

        const sourceLine = originalSourceLine.map(vectorToFloatingPoint);
        const adjustedLine = adjustSourceLineZOffset(sourceLine, CHARACTER_HEIGHT / 2);
      
        return {
          ...exit,
          destinationPoint: vectorToFloatingPoint(originalDestinationPoint),
          sourceLine: adjustedLine,
        }
    });
  }, [fieldId]);

  const formattedEntrances: FormattedGateway[] = useMemo(() => {
    const { entrances } = gateways[fieldId];

    return entrances.map(entrance => {
      const {
        destinationPoint: originalDestinationPoint,
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
      const sourceLine = adjustSourceLineZOffset(line, CHARACTER_HEIGHT / 2);
      return {
        ...entrance,
        destinationPoint: destinationPoint, 
        sourceLine: sourceLine
      }
    });
  }, [fieldId, walkmesh,walkMeshGeometry]);

  const mergedGateways = useMemo(() => [...formattedExits, ...formattedEntrances], [formattedExits, formattedEntrances]);

  const handleTransition = useCallback((gateway: FormattedGateway) => {
    console.log('Transitioning to', gateway.target, 'via gateway', gateway, 'at', gateway.destinationPoint);
    setField(gateway.target);
    setCharacterPosition(gateway.destinationPoint);
  }, [setField, setCharacterPosition]);
  console.log(formattedEntrances, formattedExits)
  return (
    <>
      {formattedExits.map(gateway => ( 
        <Gateway color="green" key={gateway.id} gateway={gateway} onIntersect={handleTransition} />
      ))}
    </>
  )
}

export default Gateways;