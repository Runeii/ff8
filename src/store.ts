import { create } from 'zustand'
import type { Object3D, Vector3 } from 'three';
import { SpringValue } from '@react-spring/web';
import MAP_NAMES from './constants/maps';
import type { Howl} from 'howler';
import { FieldData } from './Field/Field';

interface GlobalState {
  isDebugMode: boolean,

  fieldDirection: number,

  characterPosition?: Vector3,
  pendingCharacterPosition?: Vector3, // Ensures we can mark user start position before transitioning map

  currentLocationPlaceName: number,
  backgroundLayerVisibility: Record<number, boolean>,
  currentParameterStates: Record<number, number>,
  currentParameterVisibility: Record<number, boolean>,
  fieldId: typeof MAP_NAMES[number],
  pendingFieldId: typeof MAP_NAMES[number],

  initialAngle: number,
  hasMoved: boolean,
  isUserControllable: boolean,
  isRunEnabled: boolean,

  isMapJumpEnabled: boolean,

  availableMessages: string[][],

  currentMessages: Message[],

  layerScrollAdjustments: Record<number, {
    xOffset: number,
    yOffset: number,
    xScrollSpeed: number,
    yScrollSpeed: number,
  }>,

  canvasOpacitySpring: SpringValue<number>,
  isMapFadeEnabled: boolean,

  availableCharacters: number[],
  party: number[],
  congaWaypointHistory: CongaHistory[],
  playerMovementSpeed: number,
  isPartyFollowing: boolean,

  cameraAndLayerScrollSprings: {x: SpringValue<number>, y: SpringValue<number>}[],
  cameraFocusObject: Object3D | undefined,
  cameraFocusSpring: SpringValue<number> | undefined,

  hasActiveTalkMethod: boolean,
  lockedTriangles: number[],

  activeCameraId: number,

  backgroundMusicSrc?: string,
  backgroundMusic?: Howl,
  dualMusic?: Howl,

  fieldData?: FieldData,
}

export const INITIAL_STATE: GlobalState = {
    isDebugMode: false,
  
    fieldDirection: 0,
  
    availableMessages: [],
    characterPosition: undefined as unknown as Vector3,
    pendingCharacterPosition: undefined as unknown as Vector3,
    fieldId: '' as typeof MAP_NAMES[number],
    pendingFieldId: undefined as unknown as typeof MAP_NAMES[number],
  
    currentLocationPlaceName: 0, // we don't currently use this for anything
    hasMoved: false,
    isUserControllable: false,
    isRunEnabled: true,
    initialAngle: 0,
  
    backgroundLayerVisibility: {},
    currentParameterStates: {},
    currentParameterVisibility: {},
  
    isMapJumpEnabled: true,
  
    currentMessages: [],
  
    layerScrollAdjustments: {},
    canvasOpacitySpring: new SpringValue(0),
    isMapFadeEnabled: true,
  
    availableCharacters: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    party: [0, 1, 5],
    congaWaypointHistory: [],
    playerMovementSpeed: 0,
    isPartyFollowing: true,
  
    cameraAndLayerScrollSprings: new Array(8).fill(0).map(() => ({
      x: new SpringValue(0),
      y: new SpringValue(0),
    })),
    cameraFocusObject: undefined,
    cameraFocusSpring: undefined,
  
    hasActiveTalkMethod: false,
  
    lockedTriangles: [],
  
    activeCameraId: 0,
  
    backgroundMusicSrc: undefined,
    backgroundMusic: undefined,
    dualMusic: undefined,
  
    fieldData: undefined,
  }

const useGlobalStore = create<GlobalState>()(() => ({...INITIAL_STATE}))

export default useGlobalStore