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
  useFrame(({ camera, gl, scene }) => {
    const orthoCamera = scene.getObjectByName('orthoCamera') as OrthographicCamera;
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
    boundaries: null
  });

  const [characterPosition, setCharacterPosition] = useState(getInitialEntrance(data));

  const [hasPlacedWalkmesh, setHasPlacedWalkmesh] = useState(false);
  const [hasPlacedCharacter, setHasPlacedCharacter] = useState(false);
  const [hasPlacedCamera, setHasPlacedCamera] = useState(false);

  const handleTransitionField = useCallback((field: FieldData['id']) => {
    setHasPlacedCharacter(false);
    setHasPlacedWalkmesh(false);
    setHasPlacedCamera(false);
    setField(field);
  }, [setField]);

  return (
    <group >
      <WalkMesh
        setCharacterPosition={setCharacterPosition}
        setHasPlacedWalkmesh={setHasPlacedWalkmesh}
        walkmesh={data.walkmesh}
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
          />
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
  id: string
}

const FieldLoader = ({ id, ...props }: FieldLoaderProps) => {
  const [data, setData] = useState<FieldData | null>(null);

  const gl = useThree(({ gl }) => gl);
  useEffect(() => {
    setData(null);
    gl.clear();
    fetch(`/output/${id}.json`).then(response => response.json()).then(setData);
  }, [gl, id]);

  if (!data) {
    return null;
  }
  
  return <Field data={data} {...props}/>
}

export default FieldLoader