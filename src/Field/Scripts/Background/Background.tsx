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

  useScript(script, 'constructor?', {
    once: true
  });

  const result = useScript<{animationLoop: [number, number], backgroundAnimationSpeed: number, isBackgroundDrawn: boolean, isLooping: boolean}>(script, 'default', {});

  useEffect(() => {
    if (!result || script.methods.find((method) => method.methodId === 'default')?.scriptLabel !== 90) {
      return;
    }
  
    const { animationLoop, backgroundAnimationSpeed, isBackgroundDrawn, isLooping } = result;

    useGlobalStore.setState((state) => {
      state.currentParameterVisibility[targetBackgroundParam] = isBackgroundDrawn === false ? false : true
      return state;
    });

    if (backgroundAnimationSpeed) {
      setBackgroundAnimationSpeed(backgroundAnimationSpeed);
    }
  
    if (animationLoop) {
      animationFramesRef.current = animationLoop;
    }

    isLoopingRef.current = isLooping;
  }, [result, script.methods, targetBackgroundParam]);

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