import { Texture, TextureLoader, Vector3 } from 'three';
import { useLoader } from '@react-three/fiber';

import WalkMesh from './WalkMesh/WalkMesh';
import { useEffect, useState } from 'react';

import type data from '../../public/output/bcgate1a.json';
import Tiles from './Tiles/Tiles';
import Exits from './Exits/Exits';
import Camera from './Camera/Camera';
export type FieldData = typeof data;

type FieldProps = {
  data: FieldData,
  texture: Texture,
  setField: (fieldId: string) => void,
  setCharacterPosition: (position: Vector3) => void
}

const Field = ({ data, texture, setField, setCharacterPosition }: FieldProps) => {
  return (
    <>
      <Camera cameras={data.cameras} />
      <Tiles texture={texture} tiles={data.tiles} />
      <WalkMesh setCharacterPosition={setCharacterPosition} walkmesh={data.walkmesh} />
      <Exits exits={data.exits} setField={setField} setCharacterPosition={setCharacterPosition} />
    </>
  );
}

type FieldLoaderProps = Omit<FieldProps, 'data' | 'texture'> & {
  id: string
}

const FieldLoader = ({ id, ...props }: FieldLoaderProps) => {
  const [data, setData] = useState<FieldData | null>(null);

  useEffect(() => {
    fetch(`/output/${id}.json`).then(response => response.json()).then(setData);
  }, [id]);

  const texture = useLoader(TextureLoader, `/output/sprites/${id}.png`);
  
  if (!data || !texture) {
    return null;
  }
  
  return <Field data={data} texture={texture} {...props}/>
}

export default FieldLoader