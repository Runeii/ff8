import { create } from 'zustand'
import type { Object3D, Vector3 } from 'three';
import { SpringValue } from '@react-spring/web';
import MAP_NAMES from './constants/maps';
import type { Howl} from 'howler';
import { FieldData } from './Field/Field';
import createSFXController from './Field/Scripts/Script/SFXController/SFXController';

interface GlobalState {
  isDebugMode: boolean,

  isFieldLoaded: boolean,
  isMapSuspended: boolean,
  hasRenderedBackground: boolean,

  fieldDirection: number,
  isLoadingSavedGame: boolean,

  characterPosition?: Vector3,
  pendingCharacterPosition?: Vector3, // Ensures we can mark user start position before transitioning map

  currentLocationPlaceName: number,
  backgroundLayerVisibility: Record<number, boolean>,
  currentParameterStates: Record<number, number>,
  currentParameterVisibility: Record<number, boolean>,
  fieldId: typeof MAP_NAMES[number],
  pendingFieldId: typeof MAP_NAMES[number],

  initialAngle: number | undefined,
  hasMoved: boolean,
  isUserControllable: boolean,
  isPlayerClimbingLadder: boolean,
  isRunEnabled: boolean,

  isMapJumpEnabled: boolean,

  availableMessages: string[][],

  currentMessages: Message[],
  messageStyles: Record<number,{
    color: number,
    mode: number,
  }>

  layerScrollAdjustments: Record<number, {
    xOffset: number,
    yOffset: number,
    xScrollSpeed: number,
    yScrollSpeed: number,
  }>,

  colorOverlay: {
    startRed: number,
    startGreen: number,
    startBlue: number,
    endRed: number,
    endGreen: number,
    endBlue: number,
    type: 'additive' | 'subtractive',
    duration: number,
  },
  isTransitioningColorOverlay: boolean,
  fadeSpring: SpringValue<number>,
  isMapFadeEnabled: boolean,

  availableCharacters: number[],
  party: number[],
  congaWaypointHistory: CongaHistory[],
  playerMovementSpeed: number,
  isPartyFollowing: boolean,

  cameraFocusHeight: number,
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

  systemSfxController: ReturnType<typeof createSFXController>
}

export const INITIAL_STATE: GlobalState = {
    isDebugMode: false,

    isFieldLoaded: false,
    isMapSuspended: false,
    hasRenderedBackground: false,
  
    fieldDirection: 0,
    isLoadingSavedGame: false,

  
    availableMessages: [],
    characterPosition: undefined as unknown as Vector3,
    pendingCharacterPosition: undefined as unknown as Vector3,
    fieldId: '' as typeof MAP_NAMES[number],
    pendingFieldId: undefined as unknown as typeof MAP_NAMES[number],
  
    currentLocationPlaceName: 0,
    hasMoved: false,
    isPlayerClimbingLadder: false,
    isUserControllable: false,
    isRunEnabled: true,
    initialAngle: undefined,
  
    backgroundLayerVisibility: {},
    currentParameterStates: {},
    currentParameterVisibility: {},
  
    isMapJumpEnabled: true,
  
    currentMessages: [],
    messageStyles: {},
  
    layerScrollAdjustments: {},
    colorOverlay: {
      startRed: 0,
      startGreen: 0,
      startBlue: 0,
      endRed: 0,
      endGreen: 0,
      endBlue: 0,
      type: 'additive',
      duration: 0,
    },
    isTransitioningColorOverlay: false,
    fadeSpring: new SpringValue(1),
    isMapFadeEnabled: true,
  
    availableCharacters: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    party: [0,1,4],
    congaWaypointHistory: [],
    playerMovementSpeed: 0,
    isPartyFollowing: true,
  
    cameraFocusHeight: 0,
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

    systemSfxController: createSFXController('world')
  }

const useGlobalStore = create<GlobalState>()(() => ({...INITIAL_STATE}))

export default useGlobalStore