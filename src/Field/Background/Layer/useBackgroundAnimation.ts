import { invalidate, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import useGlobalStore from "../../../store";

const useBackgroundAnimation = (backgroundParamId: number) => {
  const currentStateRef = useRef(0);
  const frameCountRef = useRef(0);

  useFrame(() => {
    const { backgroundAnimations, backgroundLayerSpeeds } = useGlobalStore.getState();
    const animation = backgroundAnimations[backgroundParamId];
    if (!animation) {
      return;
    }

    if (!animation.isInProgress) {
      currentStateRef.current = animation.end;
      invalidate();
      return;
    }
  
    if (!animation.isInProgress) {
      return;
    }

    invalidate();
    const speedInFrames = backgroundLayerSpeeds[backgroundParamId] ?? 10;
    
    frameCountRef.current++;
    if (frameCountRef.current < speedInFrames * 2) {
      return;
    }

    frameCountRef.current = 0;

    const { start, end, isLooping } = animation;
    const adjustment = start > end ? -1 : 1;
    const nextStep = currentStateRef.current + adjustment;

    const conditional = start > end ? nextStep >= start : nextStep <= end;
    if (conditional) {
      currentStateRef.current = nextStep;
      return;
    }

    if (isLooping) {
      currentStateRef.current = start;
      return;
    }

    currentStateRef.current = end;
    
    useGlobalStore.setState(state => ({
      backgroundAnimations: {
        ...state.backgroundAnimations,
        [backgroundParamId]: {
          ...animation,
          isInProgress: false
        }
      }
    }));
  });

  return currentStateRef;
};

export default useBackgroundAnimation;