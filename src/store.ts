import { create } from 'zustand'
import { Vector3 } from 'three';

interface GlobalState {
  characterPosition?: Vector3,
  currentLocationPlaceName: number,
  currentParameterStates: Record<number, number>,
  currentParameterVisibility: Record<number, boolean>,
  fieldId: string,
  initialAngle: number,
  isUserControllable: boolean,
  pendingCharacterPosition?: Vector3,
  setCharacterToPendingPosition: () => void,

  currentMessages: Message[],
  controlledScrolls: Record<number, {
    layerID: number,
    x1: number,
    x2: number,
    y1: number
    y2: number
  }>,
}

const useGlobalStore = create<GlobalState>()((set) => ({
  characterPosition: undefined as unknown as Vector3,
  pendingCharacterPosition: undefined,
  setCharacterToPendingPosition: () => set((state) => ({ characterPosition: state.pendingCharacterPosition })),

  currentLocationPlaceName: 0, // we don't currently use this for anything
  fieldId: '',
  isUserControllable: true,
  initialAngle: 0,

  currentParameterStates: {},
  currentParameterVisibility: {
    1: false,
  },

  currentMessages: [],

  controlledScrolls: [],
}))

export default useGlobalStore