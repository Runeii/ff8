import { create } from 'zustand'
import { Vector3 } from 'three';
import { SpringValue } from '@react-spring/web';
import { Script } from './Field/Scripts/types';

interface GlobalState {
  characterPosition?: Vector3,
  currentLocationPlaceName: number,
  backgroundLayerVisibility: Record<number, boolean>,
  currentParameterStates: Record<number, number>,
  currentParameterVisibility: Record<number, boolean>,
  fieldId: string,
  initialAngle: number,
  isUserControllable: boolean,
  isRunEnabled: boolean,
  pendingCharacterPosition?: Vector3,
  setCharacterToPendingPosition: () => void,

  availableMessages: string[][],
  hasExitedGateway: boolean,
  fieldScripts: Script[]

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
}

const useGlobalStore = create<GlobalState>()((set) => ({
  availableMessages: [],
  characterPosition: undefined as unknown as Vector3,
  pendingCharacterPosition: undefined,
  setCharacterToPendingPosition: () => set((state) => ({ characterPosition: state.pendingCharacterPosition })),

  currentLocationPlaceName: 0, // we don't currently use this for anything
  fieldId: '',
  hasExitedGateway: false,
  isUserControllable: true,
  isRunEnabled: true,
  initialAngle: 0,

  backgroundLayerVisibility: {},
  currentParameterStates: {},
  currentParameterVisibility: {},

  fieldScripts: [],
  currentMessages: [],

  controlledScrolls: [],
  fadeSpring: {
    opacity: new SpringValue(0),
  },

  availableCharacters: [],
  party: [],

  currentFocusActor: undefined,
}))

export default useGlobalStore