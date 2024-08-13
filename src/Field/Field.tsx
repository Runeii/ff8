import { MutableRefObject, useEffect, useState } from 'react';
import { Box3, BufferGeometry, Float32BufferAttribute, Group, Line3, LineBasicMaterial, LineSegments, MathUtils, Object3D, Vector3 } from 'three';
import WalkMesh from './WalkMesh/WalkMesh';

import type data from '../../public/output/bcgate1a.json';
import Tiles from './Tiles/Tiles';
import Exits from './Exits/Exits';
import Camera from './Camera/Camera';
import { OrbitControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

export type FieldData = typeof data;

type FieldProps = {
  data: FieldData,
  setField: (fieldId: string) => void,
  setCharacterPosition: (position: Vector3) => void
}

const Field = ({ data, setField, setCharacterPosition }: FieldProps) => {
  const [sceneBoundingBox, setSceneBoundingBox] = useState(null);

  useFrame(({ gl, scene, camera }) => {
    camera.layers.disable(0);
    camera.layers.enable(1);
    camera.layers.disable(3);
    gl.autoClear = true;
    gl.render(scene, camera);

    camera.layers.enable(0);
    camera.layers.disable(1);
    camera.layers.disable(3);
    gl.clearDepth(); 
    gl.autoClear = false;
    gl.render(scene, camera);

    camera.layers.disable(0);
    camera.layers.disable(1);
    camera.layers.enable(3);
    gl.clearDepth(); 
    gl.autoClear = false;
    gl.render(scene, camera);

    gl.autoClear = true;
  }, 1);

  return (
    <>
      <Camera cameras={data.cameras} />
      {sceneBoundingBox && (
        <Tiles backgroundDetails={data.backgroundDetails} sceneBoundingBox={sceneBoundingBox} tiles={data.tiles} />
      )}
      <WalkMesh setCharacterPosition={setCharacterPosition} setSceneBoundingBox={setSceneBoundingBox} walkmesh={data.walkmesh} />
      <Exits exits={data.exits.filter(exit => exit.fieldId !== 'Unamed')} setField={setField} setCharacterPosition={setCharacterPosition} />
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