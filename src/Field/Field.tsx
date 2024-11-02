import { useEffect, useRef, useState } from 'react';
import WalkMesh from './WalkMesh/WalkMesh';

import type data from '../../public/output/escouse2.json';
import Gateways from './Gateways/Gateways';
import Camera from './Camera/Camera';
import Background from './Background/Background';
import { useFrame, useThree } from '@react-three/fiber';
import Character from '../Character/Character';
import Scripts from './Scripts/Scripts';
import { renderSceneWithLayers } from './fieldUtils';
import useGlobalStore from '../store';
import { Script } from './Scripts/types';
import { getInitialEntrance } from '../utils';

export type FieldData = typeof data;

type FieldProps = {
  data: Omit<FieldData, 'scripts'> & {
    scripts: Script[];
  },
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

  return (
    <group>
      <WalkMesh
        setHasPlacedWalkmesh={setHasPlacedWalkmesh}
        walkmesh={data.walkmesh}
      />
      {hasPlacedWalkmesh && (
        <Character hasPlacedCharacter={hasPlacedCharacter} setHasPlacedCharacter={setHasPlacedCharacter} />
      )}
      {hasPlacedCharacter && (
        <>
          <Gateways
            fieldId={data.id}
          />
          <Scripts
            doors={data.doors}
            models={data.models}
            scripts={data.scripts}
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
  setSpring: (opacity: number) => Promise<unknown>
}

const FieldLoader = ({ setSpring, ...props }: FieldLoaderProps) => {
  const fieldId = useGlobalStore(state => state.fieldId);

  const [data, setData] = useState<FieldProps['data'] | null>(null);

  const gl = useThree(({ gl }) => gl);

  useEffect(() => {
    const handleTransition = async () => {
      await setSpring(0);
      setData(null);
      gl.clear();

      if (fieldId === 'WORLD_MAP') {
        return;
      }
      const response = await fetch(`/output/${fieldId}.json`);
      const data = await response.json() as FieldProps['data'];
      setData(data);

      const pendingCharacterPosition = useGlobalStore.getState().pendingCharacterPosition;
      useGlobalStore.setState({
        characterPosition: pendingCharacterPosition ?? getInitialEntrance(data),
        pendingCharacterPosition: undefined,
        fieldTimestamp: Date.now(),
        isUserControllable: true,

        currentParameterStates: {},
        currentParameterVisibility: {},
        controlledScrolls: {},
        currentMessages: [],

        availableMessages: data.text,
        isTransitioningMap: false,

        hasActiveTalkMethod: false,
        lockedTriangles: [],
      });
    }
    handleTransition();
  }, [gl, fieldId, setSpring]);

  if (!data) {
    return null;
  }
  
  return <Field data={data} {...props} />
}

export default FieldLoader