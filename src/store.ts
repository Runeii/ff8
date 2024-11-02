import { create } from 'zustand'
import { Vector3 } from 'three';
import { SpringValue } from '@react-spring/web';

interface GlobalState {
  characterPosition?: Vector3,
  pendingCharacterPosition?: Vector3, // Ensures we can mark user start position before transitioning map

  currentLocationPlaceName: number,
  backgroundLayerVisibility: Record<number, boolean>,
  currentParameterStates: Record<number, number>,
  currentParameterVisibility: Record<number, boolean>,
  fieldId: string,
  fieldTimestamp: number,
  initialAngle: number,
  isUserControllable: boolean,
  isTransitioningMap: boolean,
  isRunEnabled: boolean,

  availableMessages: string[][],

  currentMessages: Message[],
  controlledScrolls: Record<number, {
    layerID: number,
    x1: number,
    x2: number,
    y1: number
    y2: number
  }>,

  fadeSpring: { opacity: SpringValue<number> }

  availableCharacters: number[],
  party: number[],

  currentFocusActor?: number,

  hasActiveTalkMethod: boolean,
  lockedTriangles: number[],
}

const useGlobalStore = create<GlobalState>()(() => ({
  availableMessages: [],
  characterPosition: undefined as unknown as Vector3,
  pendingCharacterPosition: undefined as unknown as Vector3,

  currentLocationPlaceName: 0, // we don't currently use this for anything
  fieldId: '',
  fieldTimestamp: 0, // used to cleanup timers in state
  isUserControllable: true,
  isTransitioningMap: true,
  isRunEnabled: true,
  initialAngle: 0,

  backgroundLayerVisibility: {},
  currentParameterStates: {},
  currentParameterVisibility: {},

  currentMessages: [],

  controlledScrolls: [],
  fadeSpring: {
    opacity: new SpringValue(0),
  },

  availableCharacters: [0, 1, 2, 3, 4, 5, 6, 7],
  party: [0, 1, 4],

  currentFocusActor: undefined,

  hasActiveTalkMethod: false,

  lockedTriangles: [],
}))

export default useGlobalStore