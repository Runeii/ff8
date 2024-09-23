import { useCallback, useEffect, useRef, useState } from 'react';
import {  OrthographicCamera, PerspectiveCamera } from 'three';
import WalkMesh from './WalkMesh/WalkMesh';

import type data from '../../public/output/bcgate1a.json';
import Gateways from './Gateways/Gateways';
import Camera from './Camera/Camera';
import Background from './Background/Background';
import { useFrame, useThree } from '@react-three/fiber';
import Character from '../Character/Character';
import { getInitialEntrance } from '../utils';
export type FieldData = typeof data;

type FieldProps = {
  data: FieldData,
  setField: (fieldId: string) => void,
}

const Field = ({ data, setField }: FieldProps) => {
  const orthoCamera = useThree(({ scene }) => scene.getObjectByName('orthoCamera') as OrthographicCamera);
  useFrame(({ camera, gl, scene }) => {
    const perspectiveCamera = camera as PerspectiveCamera;

    if (!orthoCamera) {
      return;
    }

    gl.clear()
    gl.autoClear = false;
    gl.clearDepth();
    orthoCamera.layers.set(1);
    gl.render(scene, orthoCamera);
    
    gl.clearDepth();
    perspectiveCamera.layers.set(0);
    gl.render(scene, perspectiveCamera);

    gl.clearDepth();
    orthoCamera.layers.set(2);
    gl.render(scene, orthoCamera);
  }, 1);

  const backgroundPanRef = useRef<CameraPanAngle>({
    yaw: 0,
    pitch: 0,
    cameraZoom: 0,
    boundaries: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
  });

  const [characterPosition, setCharacterPosition] = useState(getInitialEntrance(data));

  const [hasPlacedWalkmesh, setHasPlacedWalkmesh] = useState(false);
  const [hasPlacedCharacter, setHasPlacedCharacter] = useState(false);

  const handleTransitionField = useCallback((field: FieldData['id']) => {
    setHasPlacedCharacter(false);
    setHasPlacedWalkmesh(false);
    setField(field);
  }, [setField]);

  return (
    <group key={data.id}>
      <WalkMesh
        setCharacterPosition={setCharacterPosition}
        setHasPlacedWalkmesh={setHasPlacedWalkmesh}
        walkmesh={data.walkmesh}
      />
      {hasPlacedWalkmesh && (
        <>
          <Background backgroundPanRef={backgroundPanRef} data={data} />
          <Character
            position={characterPosition}
            setHasPlacedCharacter={setHasPlacedCharacter}
          />
        </>
      )}
      {hasPlacedCharacter && (
        <>
          <Gateways
            gateways={data.gateways}
            setField={handleTransitionField}
            setCharacterPosition={setCharacterPosition}
          />
          <Camera backgroundPanRef={backgroundPanRef} data={data} />
        </>
      )}
      <ambientLight intensity={0.5} />
    </group>
  );
}

type FieldLoaderProps = Omit<FieldProps, 'data'> & {
  id: string
}

const FieldLoader = ({ id, ...props }: FieldLoaderProps) => {
  const [data, setData] = useState<FieldData | null>(null);

  useEffect(() => {
    fetch(`/output/${id}.json`).then(response => response.json()).then(setData);
  }, [id]);
  
  if (!data) {
    return null;
  }
  
  return <Field data={data} {...props}/>
}

export default FieldLoader