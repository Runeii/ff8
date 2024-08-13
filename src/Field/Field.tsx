import { useEffect, useState } from 'react';
import { Vector3 } from 'three';
import WalkMesh from './WalkMesh/WalkMesh';

import type data from '../../public/output/bcgate1a.json';
import Tiles from './Tiles/Tiles';
import Exits from './Exits/Exits';
import Camera from './Camera/Camera';
export type FieldData = typeof data;

type FieldProps = {
  data: FieldData,
  setField: (fieldId: string) => void,
  setCharacterPosition: (position: Vector3) => void
}

const Field = ({ data, setField, setCharacterPosition }: FieldProps) => {
  return (
    <>
      <Camera backgroundDetails={data.backgroundDetails} cameras={data.cameras} />
      <Tiles backgroundDetails={data.backgroundDetails} tiles={data.tiles} />
      <WalkMesh setCharacterPosition={setCharacterPosition} walkmesh={data.walkmesh} />
      <Exits exits={data.exits} setField={setField} setCharacterPosition={setCharacterPosition} />
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