import { useEffect, useMemo, useRef, useState } from 'react';
import {  BufferAttribute, BufferGeometry } from 'three';
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
import useGlobalStore from '../store';

export type FieldData = typeof data;

type FieldProps = {
  data: FieldData,
}

const Field = ({ data }: FieldProps) => {
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
    <group>
      <WalkMesh
        setHasPlacedWalkmesh={setHasPlacedWalkmesh}
        walkmesh={walkMeshGeometry}
      />
      {hasPlacedWalkmesh && (
        <Character setHasPlacedCharacter={setHasPlacedCharacter} />
      )}
      {hasPlacedCharacter && (
        <>
          <Gateways
            gateways={data.gateways}
            walkMeshGeometry={walkMeshGeometry}
          />
          <Scripts scripts={data.scripts} />
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

type FieldLoaderProps = Omit<FieldProps, 'data'> & {
  setSpring: (opacity: number) => Promise<unknown>
}

const FieldLoader = ({ setSpring, ...props }: FieldLoaderProps) => {
  const fieldId = useGlobalStore(state => state.fieldId);
  const setCharacterToPendingPosition = useGlobalStore(state => state.setCharacterToPendingPosition);

  const [data, setData] = useState<FieldData | null>(null);

  const gl = useThree(({ gl }) => gl);

  useEffect(() => {
    const handleTransition = async () => {
      await setSpring(0);
      setData(null);
      gl.clear();
      const response = await fetch(`/output/${fieldId}.json`);
      const data = await response.json();
      setData(data);
      useGlobalStore.setState({
        currentParameterStates: {},
        currentParameterVisibility: {},
      });
      if (!useGlobalStore.getState().pendingCharacterPosition) {
        useGlobalStore.setState({ pendingCharacterPosition: getInitialEntrance(data) });
      }
      setCharacterToPendingPosition();
      await setSpring(1);
    }
    handleTransition();
  }, [gl, fieldId, setSpring, setCharacterToPendingPosition]);

  if (!data) {
    return null;
  }
  
  return <Field data={data} {...props} />
}

export default FieldLoader