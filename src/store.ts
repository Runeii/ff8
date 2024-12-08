import { create } from 'zustand'
import { Vector3 } from 'three';
import { SpringValue } from '@react-spring/web';
import MAP_NAMES from './constants/maps';

interface GlobalState {
  isDebugMode: boolean,

  characterPosition?: Vector3,
  pendingCharacterPosition?: Vector3, // Ensures we can mark user start position before transitioning map

  currentLocationPlaceName: number,
  backgroundLayerVisibility: Record<number, boolean>,
  currentParameterStates: Record<number, number>,
  currentParameterVisibility: Record<number, boolean>,
  fieldId: typeof MAP_NAMES[number],
  pendingFieldId: typeof MAP_NAMES[number],

  initialAngle: number,
  isUserControllable: boolean,
  isRunEnabled: boolean,

  isMapJumpEnabled: boolean,

  availableMessages: string[][],

  currentMessages: Message[],
  controlledScrolls: Record<number, {
    layerID: number,
    x1: number,
    x2: number,
    y1: number
    y2: number
  }>,

  canvasOpacitySpring: SpringValue<number>,
  isMapFadeEnabled: boolean,

  availableCharacters: number[],
  party: number[],
  congaWaypointHistory: CongaHistory[],
  playerSpeed: number,
  playerAnimationIndex: number,

  currentFocusActor?: number,

  hasActiveTalkMethod: boolean,
  lockedTriangles: number[],

  activeCameraId: number,
}

const useGlobalStore = create<GlobalState>()(() => ({
  isDebugMode: false,

  availableMessages: [],
  characterPosition: undefined as unknown as Vector3,
  pendingCharacterPosition: undefined as unknown as Vector3,
  fieldId: '' as typeof MAP_NAMES[number],
  pendingFieldId: undefined as unknown as typeof MAP_NAMES[number],

  currentLocationPlaceName: 0, // we don't currently use this for anything
  isUserControllable: true,
  isRunEnabled: true,
  initialAngle: 0,

  backgroundLayerVisibility: {},
  currentParameterStates: {},
  currentParameterVisibility: {},

  isMapJumpEnabled: true,

  currentMessages: [],

  controlledScrolls: [],
  canvasOpacitySpring: new SpringValue(0),
  isMapFadeEnabled: true,

  availableCharacters: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  party: [0, 2, 3],
  congaWaypointHistory: [],
  playerSpeed: 0,
  playerAnimationIndex: 0,

  currentFocusActor: undefined,

  hasActiveTalkMethod: false,

  lockedTriangles: [],

  activeCameraId: 0,
}))

export default useGlobalStore