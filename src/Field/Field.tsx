import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {  BufferAttribute, BufferGeometry, Vector3 } from 'three';
import WalkMesh from './WalkMesh/WalkMesh';

import type data from '../../public/output/bghall_2.json';
import Gateways from './Gateways/Gateways';
import Camera from './Camera/Camera';
import Background from './Background/Background';
import { useFrame, useThree } from '@react-three/fiber';
import Character from '../Character/Character';
import Scripts from './Scripts/Scripts';
import { getInitialEntrance, vectorToFloatingPoint } from '../utils';
import { renderSceneWithLayers } from './fieldUtils';
export type FieldData = typeof data;

type FieldProps = {
  characterPosition: Vector3,
  data: FieldData,
  setCharacterPosition: (position: Vector3) => void,
  setField: (fieldId: string) => void,
}

const Field = ({ characterPosition, data, setCharacterPosition, setField }: FieldProps) => {
  useFrame(({ camera, gl, scene }) => renderSceneWithLayers(scene, camera, gl), 1);

  const backgroundPanRef = useRef<CameraPanAngle>({
    yaw: 0,
    pitch: 0,
    cameraZoom: 0,
    boundaries: null
  });

  const [hasPlacedWalkmesh, setHasPlacedWalkmesh] = useState(false);
  const [hasPlacedCharacter, setHasPlacedCharacter] = useState(false);
  const [hasPlacedCamera, setHasPlacedCamera] = useState(false);

  const handleTransitionField = useCallback((field: FieldData['id']) => {
    setHasPlacedCharacter(false);
    setHasPlacedWalkmesh(false);
    setHasPlacedCamera(false);
    setField(field);
  }, [setField]);

  const walkMeshGeometry = useMemo(() => {
    const geometries = data.walkmesh.map(triangle => {
      const geometry = new BufferGeometry();
      const vertices = new Float32Array([
        ...vectorToFloatingPoint(triangle.vertices[0]).toArray(),
        ...vectorToFloatingPoint(triangle.vertices[1]).toArray(),
        ...vectorToFloatingPoint(triangle.vertices[2]).toArray(),
        ...vectorToFloatingPoint(triangle.vertices[0]).toArray(),
      ]);

      geometry.setAttribute('position', new BufferAttribute(vertices, 3));      
      geometry.computeVertexNormals();
      
      return geometry;
    });

    return geometries;
  }, [data.walkmesh]);


  return (
    <group >
      <WalkMesh
        setCharacterPosition={setCharacterPosition}
        setHasPlacedWalkmesh={setHasPlacedWalkmesh}
        walkmesh={walkMeshGeometry}
      />
      {hasPlacedWalkmesh && (
        <Character
          position={characterPosition}
          setHasPlacedCharacter={setHasPlacedCharacter}
        />
      )}
      {hasPlacedCharacter && (
        <>
          <Gateways
            fieldId={data.id}
            setField={handleTransitionField}
            setCharacterPosition={setCharacterPosition}
            walkMeshGeometry={walkMeshGeometry}
          />
          <Scripts data={data} />
          <Camera backgroundPanRef={backgroundPanRef} data={data} setHasPlacedCamera={setHasPlacedCamera} />
        </>
      )}
      {hasPlacedCamera && (
        <Background backgroundPanRef={backgroundPanRef} data={data} />
      )}
      <ambientLight intensity={0.5} />
    </group>
  );
}

type FieldLoaderProps = Omit<FieldProps, 'data' | 'characterPosition' | 'setCharacterPosition'> & {
  id: string,
  setSpring: (opacity: number) => Promise<unknown>
}

const FieldLoader = ({ id, setSpring, ...props }: FieldLoaderProps) => {
  const [data, setData] = useState<FieldData | null>(null);
  const [characterPosition, setCharacterPosition] = useState<Vector3>(new Vector3(0,0,0));

  const gl = useThree(({ gl }) => gl);
  useEffect(() => {
    const handleTransition = async () => {
      await setSpring(0);
      setData(null);
      gl.clear();
      const response = await fetch(`/output/${id}.json`);
      const data = await response.json();
      setData(data);
      setCharacterPosition(currentPosition => {
        if (currentPosition.x !== 0 || currentPosition.y !== 0 || currentPosition.z !== 0) {
          return currentPosition;
        }
        return getInitialEntrance(data)
      });
      await setSpring(1);
    }
    handleTransition();
  }, [gl, id, setSpring]);

  if (!data) {
    return null;
  }
  
  return <Field data={data} {...props} characterPosition={characterPosition} setCharacterPosition={setCharacterPosition} />
}

export default FieldLoader