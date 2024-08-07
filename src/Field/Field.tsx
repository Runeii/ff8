import { useLoader, useThree } from '@react-three/fiber';
import { DoubleSide, PerspectiveCamera, Texture, TextureLoader, Vector3 } from 'three';

import WalkMesh from './WalkMesh/WalkMesh';
import { OrthographicCamera, Sphere } from '@react-three/drei';
import { useEffect, useState } from 'react';

import type data from '../../public/output/bcgate1a.json';
import Tiles from './Tiles/Tiles';
import Exits from './Exits/Exits';
export type FieldData = typeof data;

type FieldProps = {
  data: FieldData,
  texture: Texture,
  setField: (fieldId: string) => void,
  setCharacterPosition: (position: Vector3) => void
}

const Field = ({ data, texture, setField, setCharacterPosition }: FieldProps) => {
  const [target, setTarget] = useState(new Vector3(0, 0, 0));

  useThree(({ camera }) => {
    const {camera_axis,camera_position,camera_zoom} = data.cameras[0];
    const camAxisX = new Vector3(camera_axis[0].x, camera_axis[0].y, camera_axis[0].z).divideScalar(4096);
    const camAxisY = new Vector3(camera_axis[1].x, camera_axis[1].y, camera_axis[1].z).clone().negate().divideScalar(4096);
    const camAxisZ = new Vector3(camera_axis[2].x, camera_axis[2].y, camera_axis[2].z).divideScalar(4096);

    const camPos = new Vector3(...camera_position).clone().divideScalar(4096);
    camPos.y = -camPos.y; // Negate Y to match the original logic

    // Calculate the translation components
    const tx = -(camPos.x * camAxisX.x + camPos.y * camAxisY.x + camPos.z * camAxisZ.x);
    const ty = -(camPos.x * camAxisX.y + camPos.y * camAxisY.y + camPos.z * camAxisZ.y);
    const tz = -(camPos.x * camAxisX.z + camPos.y * camAxisY.z + camPos.z * camAxisZ.z);

    const lookAtTarget = new Vector3(
      tx + camAxisZ.x,
      ty + camAxisZ.y,
      tz + camAxisZ.z
    );

    camera.position.set(tx, ty, tz);
    camera.lookAt(lookAtTarget);
    if (target.x !== lookAtTarget.x || target.y !== lookAtTarget.y || target.z !== lookAtTarget.z) {
      setTarget(lookAtTarget);
    }
    camera.up.set(camAxisY.x, camAxisY.y, camAxisY.z);

    // 320 is a hack here...but it seems

    (camera as PerspectiveCamera).fov = (2 * Math.atan(240.0/(2.0 * camera_zoom))) * 57.29577951;
    camera.updateProjectionMatrix();
  });
  

  return (
    <>
      <Tiles texture={texture} tiles={data.tiles} />
      <WalkMesh setCharacterPosition={setCharacterPosition} walkmesh={data.walkmesh} />
      <Exits exits={data.exits} setField={setField} setCharacterPosition={setCharacterPosition} />
    </>
  );
}

const FieldLoader = ({ id, ...props }: FieldProps & {id: string}) => {
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