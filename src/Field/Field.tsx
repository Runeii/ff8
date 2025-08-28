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
import { getFieldData } from './fieldUtils';
import Onboarding from '../Onboarding/Onboarding';
import { AREA_NAMES } from '../constants/areaNames';
import { preloadMapSoundBank } from './Scripts/Script/SFXController/webAudio';
import { sendToDebugger } from '../Debugger/debugUtils';

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

  return (
    <group>
      <WalkMesh walkmesh={data.walkmesh} />
      <Camera backgroundPanRef={backgroundPanRef} data={data} />
      <Scripts
        doors={data.doors}
        models={data.models}
        scripts={data.scripts}
        sounds={data.sounds}
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

  const [data, setData] = useState<FieldProps['data'] | null>(null);
  
  const gl = useThree(({ gl }) => gl);

  useEffect(() => {
    const handleTransition = async () => {
      if (!pendingFieldId) {
        console.warn('Trying to transition with no pending field id')
        return;
      }
      const { isLoadingSavedGame, isMapFadeEnabled } = useGlobalStore.getState();
      
      const lastFieldId = useGlobalStore.getState().fieldId;
      const isSwitchingBetweenMaps = lastFieldId && pendingFieldId && pendingFieldId !== lastFieldId;
      if (isMapFadeEnabled && isSwitchingBetweenMaps) {
        // @ts-expect-error We don't need args for this function
        OPCODE_HANDLERS.FADEOUT();
        // @ts-expect-error We don't need args for this function
        await OPCODE_HANDLERS.FADESYNC();

        // Fixes a quirk in the engine. See feroad, checking 0/10
        MEMORY[87] = 1;
      }
      
      sendToDebugger('reset')
      setData(null);
      gl.clear();

      if (lastFieldId) {
        MEMORY[84] = Object.values(MAP_NAMES).indexOf(lastFieldId);
      }

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
        availableMessages: data.text,

        isLoadingSavedGame: false,
        isMapFadeEnabled: true,

        characterPosition: pendingCharacterPosition ?? getInitialEntrance(data),
        pendingCharacterPosition: undefined,

        hasMoved: false,
        isUserControllable: pendingFieldId !== 'start0',
        isRunEnabled: true,

        walkmeshController: undefined,
        backgroundLayerVisibility: {},
        backgroundAnimations: {},
        backgroundLayerSpeeds: {},
        backgroundScrollRatios: {},
        layerScrollAdjustments: {},

        cameraFocusHeight: data.cameraFocusHeight,
        cameraFocusObject: undefined,
        cameraFocusSpring: undefined,
        cameraScrollOffset: {} as CameraScrollTransition,
        layerScrollOffsets: {},

        colorOverlay: {
          startRed: 0,
          startGreen: 0,
          startBlue: 0,
          endRed: 0,
          endGreen: 0,
          endBlue: 0,
          duration: 0,
          type: 'additive'
        },
        
        currentMessages: [],
        messageStyles: {},
  

        hasActiveTalkMethod: false,
        lockedTriangles: [],
        
        globalMeshTint: [128, 128, 128],

        activeCameraId: 0,
        pendingFieldId: undefined,
        fieldId: pendingFieldId,

        congaWaypointHistory: [],
      });

      preloadMapSoundBank(data.sounds);
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
  
  return <Field data={data} key={fieldId} {...props} />
}

export default FieldLoader