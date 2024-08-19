import { useEffect, useRef, useState } from 'react';
import { Box3, OrthographicCamera, PerspectiveCamera, Vector3 } from 'three';
import WalkMesh from './WalkMesh/WalkMesh';

import type data from '../../public/output/bcgate1a.json';
import Exits from './Exits/Exits';
import Camera from './Camera/Camera';
import Background from './Background/Background';
import { useFrame, useThree } from '@react-three/fiber';
export type FieldData = typeof data;

type FieldProps = {
  data: FieldData,
  setField: (fieldId: string) => void,
  setCharacterPosition: (position: Vector3) => void
}

const Field = ({ data, setField, setCharacterPosition }: FieldProps) => {
  const [sceneBoundingBox, setSceneBoundingBox] = useState(new Box3());

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

  const backgroundPanRef = useRef<{x: number, y: number}>({x: 0, y: 0});

  return (
    <>
      <Camera backgroundPanRef={backgroundPanRef} backgroundDetails={data.backgroundDetails} cameras={data.cameras} sceneBoundingBox={sceneBoundingBox} />
      <Background backgroundPanRef={backgroundPanRef} backgroundDetails={data.backgroundDetails} tiles={data.tiles} />
      <WalkMesh setCharacterPosition={setCharacterPosition} setSceneBoundingBox={setSceneBoundingBox} walkmesh={data.walkmesh} />
      <Exits exits={data.exits} setField={setField} setCharacterPosition={setCharacterPosition} />
      <ambientLight intensity={0.5} />
    </>
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