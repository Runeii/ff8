import { useEffect, useRef, useState } from 'react';
import WalkMesh from './WalkMesh/WalkMesh';

import type data from '../../public/output/escouse2.json';
import Gateways from './Gateways/Gateways';
import Camera from './Camera/Camera';
import Background from './Background/Background';
import { useThree } from '@react-three/fiber';
import Scripts from './Scripts/Scripts';
import useGlobalStore from '../store';
import { Script } from './Scripts/types';
import { getInitialEntrance } from '../utils';
import { MEMORY } from './Scripts/Script/handlers';
import MAP_NAMES from '../constants/maps';
import { SpringValue } from '@react-spring/web';

export type FieldData = typeof data;

type FieldProps = {
  data: Omit<FieldData, 'scripts'> & {
    scripts: Script[];
  },
}

const Field = ({ data }: FieldProps) => {
  const backgroundPanRef = useRef<CameraPanAngle>({
    panX: 0,
    panY: 0,
  });

  return (
    <group>
      <WalkMesh
        walkmesh={data.walkmesh}
      />
      <Camera
        backgroundPanRef={backgroundPanRef}
        data={data}
      />
      <Scripts
        doors={data.doors}
        models={data.models}
        scripts={data.scripts}
      />
      <Background backgroundPanRef={backgroundPanRef} data={data} />
      <Gateways fieldId={data.id} />
    </group>
  );
}

type FieldLoaderProps = Omit<FieldProps, 'data'> & {
  opacitySpring: SpringValue<number>,
}

const FieldLoader = ({ opacitySpring, ...props }: FieldLoaderProps) => {

  const pendingFieldId = useGlobalStore(state => state.pendingFieldId);
  const fieldId = useGlobalStore(state => state.fieldId);

  const currentFieldIdRef = useRef(fieldId);
  const [data, setData] = useState<FieldProps['data'] | null>(null);
  
  const gl = useThree(({ gl }) => gl);

  useEffect(() => {
    if (fieldId === currentFieldIdRef.current) {
      return;
    }

    MEMORY[84] = Object.values(MAP_NAMES).indexOf(currentFieldIdRef.current);
    currentFieldIdRef.current = fieldId;
  }, [fieldId]);

  useEffect(() => {
    const handleTransition = async () => {
      const {isMapFadeEnabled} = useGlobalStore.getState();

      if (isMapFadeEnabled) {
       // await opacitySpring.start(0);
      }

      setData(null);
      gl.clear();

      if (pendingFieldId === 'wm00') {
        useGlobalStore.setState({
          fieldId: 'wm00',
          pendingFieldId: undefined,
        });

        return;
      }

      const response = await fetch(`/output/${pendingFieldId}.json`);
      const data = await response.json() as FieldProps['data'];
      setData(data);

      const pendingCharacterPosition = useGlobalStore.getState().pendingCharacterPosition;
      useGlobalStore.setState({
        fieldDirection: data.controlDirection,

        characterPosition: pendingCharacterPosition ?? getInitialEntrance(data),
        pendingCharacterPosition: undefined,

        isUserControllable: true,
        isRunEnabled: true,

        currentParameterStates: {},
        currentParameterVisibility: {},
        controlledScrolls: {},
        currentMessages: [],

        availableMessages: data.text,

        hasActiveTalkMethod: false,
        lockedTriangles: [],

        activeCameraId: 0,
        pendingFieldId: undefined,
        fieldId: pendingFieldId,

        congaWaypointHistory: [],
      });
    }

    if (!pendingFieldId) {
      return;
    }
    handleTransition();
  }, [gl, pendingFieldId, opacitySpring]);

  if (!data) {
    return null;
  }
  
  return <Field data={data} {...props} />
}

export default FieldLoader