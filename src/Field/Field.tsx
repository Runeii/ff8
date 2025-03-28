import { useEffect, useRef, useState } from 'react';
import WalkMesh from './WalkMesh/WalkMesh';

import type data from '../../public/output/escouse2.json';
import Gateways from './Gateways/Gateways';
import Camera from './Camera/Camera';
import Background from './Background/Background';
import { useFrame, useThree } from '@react-three/fiber';
import Scripts from './Scripts/Scripts';
import useGlobalStore, { INITIAL_STATE } from '../store';
import { Script } from './Scripts/types';
import { getInitialEntrance } from '../utils';
import { MEMORY } from './Scripts/Script/handlers';
import MAP_NAMES from '../constants/maps';
import { SpringValue } from '@react-spring/web';
import { getFieldData } from './fieldUtils';
import Onboarding from '../Onboarding/Onboarding';

export type RawFieldData = typeof data;

export type FieldData = Omit<RawFieldData, 'scripts' | 'tiles'> & {
  scripts: Script[];
  tiles: {
    index: number,
    X: number,
    Y: number,
    Z: number,
    texID: number,
    isBlended: number,
    depth: number,
    palID: number,
    layerID: number,
    blendType: number,
    parameter: number,
    state: number,
  }[]
};

type FieldProps = {
  data: FieldData
}

const Field = ({ data }: FieldProps) => {
  const backgroundPanRef = useRef<CameraPanAngle>({
    boundaries: {
      left: 0,
      right: 0,
      bottom: 0,
      top: 0
    },
    panX: 0,
    panY: 0,
  });

  // Allow animation controllers to know when the frame is updated outside of R3F
  useFrame(({ clock }) => {
    const event = new CustomEvent('frame', {
      detail: {
        delta: clock.getDelta(),
      }
    });
    window.dispatchEvent(event);
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

      if (isMapFadeEnabled && import.meta.env.DEV !== true) {
       await opacitySpring.start(0);
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

      const data = await getFieldData(pendingFieldId);
      setData(data);

      const pendingCharacterPosition = useGlobalStore.getState().pendingCharacterPosition;

      useGlobalStore.setState({
        fieldData: data,
        fieldDirection: data.controlDirection,

        characterPosition: pendingCharacterPosition ?? getInitialEntrance(data),
        pendingCharacterPosition: undefined,

        hasMoved: false,
        isUserControllable: pendingFieldId !== 'start0',
        isRunEnabled: true,

        currentParameterStates: {},
        currentParameterVisibility: {},
        layerScrollAdjustments: {},

        cameraAndLayerStartXY: INITIAL_STATE.cameraAndLayerStartXY,
        cameraAndLayerEndXY: INITIAL_STATE.cameraAndLayerEndXY,
        cameraAndLayerDurations: INITIAL_STATE.cameraAndLayerDurations,
        cameraAndLayerModes: INITIAL_STATE.cameraAndLayerModes,
        cameraAndLayerTransitioning: INITIAL_STATE.cameraAndLayerTransitioning,
        cameraAndLayerTransitionProgresses: INITIAL_STATE.cameraAndLayerTransitionProgresses,
        cameraFocusObject: undefined,
        

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

  
  if (fieldId === 'wm00') {
    return <Onboarding />
  }

  if (!data) {
    return null;
  }
  
  return <Field data={data} {...props} />
}

export default FieldLoader