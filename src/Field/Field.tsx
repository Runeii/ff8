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
import { MEMORY, OPCODE_HANDLERS } from './Scripts/Script/handlers';
import MAP_NAMES from '../constants/maps';
import { SpringValue } from '@react-spring/web';
import { getFieldData } from './fieldUtils';
import Onboarding from '../Onboarding/Onboarding';
import { AREA_NAMES } from '../constants/areaNames';

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

  const currentLocationPlaceName = useGlobalStore(state => state.currentLocationPlaceName as number);
  useEffect(() => {
    const name = AREA_NAMES[currentLocationPlaceName as keyof typeof AREA_NAMES]
    // Remove `{Term [x]}` string but keep the [x] part
    if (name) {
      const cleanedString = name.replace(/\{Term ([^}]+)\}/, "$1");
      document.title = `FF8 GL - ${cleanedString}`;
    } else {
      document.title = `FF8 GL - ${data.id}`;
    }
    
  }, [currentLocationPlaceName, data.id]);

console.log('Field loaded:', data.id, 'with scripts:', data.scripts.length, 'and doors:', data.doors.length);
  return (
    <group>
      <WalkMesh
        walkmesh={data.walkmesh}
      />
      <Camera backgroundPanRef={backgroundPanRef} data={data} />
      <Scripts
        doors={data.doors}
        models={data.models}
        scripts={data.scripts}
      />
      <Background backgroundPanRef={backgroundPanRef} data={data} />
      <Gateways fieldId={data.id}  />
    </group>
  );
}

type FieldLoaderProps = Omit<FieldProps, 'data'>;

const FieldLoader = (props: FieldLoaderProps) => {
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
      const { isLoadingSavedGame, isMapFadeEnabled } = useGlobalStore.getState();
      
      const nonReactiveFieldId = useGlobalStore.getState().fieldId;
      const isSwitchingBetweenMaps = nonReactiveFieldId && pendingFieldId && pendingFieldId !== nonReactiveFieldId;
      if (isMapFadeEnabled && isSwitchingBetweenMaps) {
        // @ts-expect-error We don't need args for this function
        OPCODE_HANDLERS.FADEOUT();
        // @ts-expect-error We don't need args for this function
        await OPCODE_HANDLERS.FADESYNC();
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

      if (!isLoadingSavedGame) {
        MEMORY[261] = 0;
      }

      useGlobalStore.setState({
        fieldData: data,
        fieldDirection: data.controlDirection,
        isLoadingSavedGame: false,

        characterPosition: pendingCharacterPosition ?? getInitialEntrance(data),
        pendingCharacterPosition: undefined,

        hasMoved: false,
        isUserControllable: pendingFieldId !== 'start0',
        isRunEnabled: true,

        currentParameterStates: {},
        currentParameterVisibility: {},
        layerScrollAdjustments: {},

        cameraFocusObject: undefined,
        cameraFocusSpring: undefined,
        cameraAndLayerScrollSprings: new Array(8).fill(0).map(() => ({
          x: new SpringValue(0),
          y: new SpringValue(0),
        })),
        

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
  }, [gl, pendingFieldId]);

  
  if (fieldId === 'wm00') {
    return <Onboarding />
  }

  if (!data) {
    return null;
  }
  
  return <Field data={data} {...props} />
}

export default FieldLoader