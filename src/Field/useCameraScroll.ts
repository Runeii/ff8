import { useRef } from "react";
import useGlobalStore from "../store";
import { useFrame } from "@react-three/fiber";
import { MathUtils } from "three";


const useCameraScroll = (
  type: 'camera' | 'layer',
  layerID?: number
) => {
  const currentValue = useRef({
    x: 0,
    y: 0,
  });
  
  const transitionState = useRef({
    currentTransition: null as CameraScrollTransition | null,
    startTime: 0,
  });

  useFrame((state) => {
    if (type === 'layer' && layerID === undefined) {
      console.warn('Layer ID is undefined');
      return;
    }

    const currentTransition =
      type === 'layer'
        ? useGlobalStore.getState().layerScrollOffsets[layerID!]
        : useGlobalStore.getState().cameraScrollOffset;

    if (!currentTransition) {
      return;
    }

    if (!currentTransition.isInProgress) {
      return;
    }

    if (currentTransition !== transitionState.current.currentTransition) {
      transitionState.current.currentTransition = currentTransition;
      transitionState.current.startTime = state.clock.elapsedTime;
    }

    const { startX, endX, startY, endY, duration } = transitionState.current.currentTransition;
    const elapsed = state.clock.elapsedTime - transitionState.current.startTime;
    const progress = duration === 0 ? 1 : Math.min(elapsed / (duration / 30), 1);

    currentValue.current.x = MathUtils.lerp(
      startX,
      endX,
      progress
    );
    
    currentValue.current.y = MathUtils.lerp(
      startY,
      endY,
      progress
    );

    if (progress !== 1) {
      return;
    }

    if (type === 'layer') {
      useGlobalStore.setState({
        layerScrollOffsets: {
          ...useGlobalStore.getState().layerScrollOffsets,
          [layerID!]: {
            ...currentTransition,
            isInProgress: false
          }
        }
      });
    } else {
      useGlobalStore.setState({
        cameraScrollOffset: {
          ...currentTransition,
          isInProgress: false
        }
      });
    }
  });

  return currentValue;
};

export default useCameraScroll;