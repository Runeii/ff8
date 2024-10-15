import { useEffect, useRef, useState } from "react";
import useGlobalStore from "../../../store";
import { Script } from "../types";
import useScript from "../useScript";

type BackgroundProps = {
  script: Script;
};

const Background = ({ script }: BackgroundProps) => {
  const targetBackgroundParam = script.backgroundParamId;

  const [backgroundAnimationSpeed, setBackgroundAnimationSpeed] = useState<number>(0);
  const animationFramesRef = useRef<[number, number]>([0, 0]);
  const isLoopingRef = useRef<boolean>(false);

  useScript(script, 'constructor?', () => null, {
    once: true
  });

  useScript<{animationLoop: [number, number], backgroundAnimationSpeed: number, isBackgroundDrawn: boolean, isLooping: boolean}>(script, 'default',
    (result) => {
      const { animationLoop, backgroundAnimationSpeed, isBackgroundDrawn, isLooping } = result;
  
      if (isBackgroundDrawn === undefined) {
        useGlobalStore.setState((state) => {
          state.currentParameterVisibility[targetBackgroundParam] = isBackgroundDrawn === false ? false : true
          return state;
        });
      }
    
      if (backgroundAnimationSpeed !== undefined) {
        setBackgroundAnimationSpeed(backgroundAnimationSpeed);
      }
    
      if (animationLoop !== undefined) {
        animationFramesRef.current = animationLoop;
      }
  
      if (isLooping !== undefined) {
        isLoopingRef.current = isLooping;
      }
    }
  );

  useEffect(() => {
    if (backgroundAnimationSpeed === 0) {
      return;
    }

    const interval = setInterval(() => {
      const currentParameterStates = useGlobalStore.getState().currentParameterStates;
      let thisParameter = currentParameterStates[targetBackgroundParam];

      if (!thisParameter || thisParameter >= animationFramesRef.current[1]) {
        thisParameter = animationFramesRef.current[0];
      }

      thisParameter += 1;

      useGlobalStore.setState({
        currentParameterStates: {
          ...currentParameterStates,
          [targetBackgroundParam]: thisParameter
        }
      })

      if (thisParameter === animationFramesRef.current[1] && !isLoopingRef.current) {
        clearInterval(interval);
      }
    }, backgroundAnimationSpeed * 32);

    return () => clearInterval(interval);
  }, [backgroundAnimationSpeed, targetBackgroundParam]);

  return null;
}

export default Background;