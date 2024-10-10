import { useEffect, useRef, useState } from "react";
import useGlobalStore from "../../../store";
import { Script } from "../types";
import useScript from "../useScript";
import { useFrame } from "@react-three/fiber";

type BackgroundProps = {
  script: Script;
};

const Background = ({ script }: BackgroundProps) => {
  const targetBackgroundParam = script.backgroundParamId;

  const [backgroundAnimationSpeed, setBackgroundAnimationSpeed] = useState<number>(0);
  const animationLoopRef = useRef<[number, number]>([0, 0]);

  useScript(script, 'constructor?', {
    once: true
  });

  useScript(script, 'default', {}, (result) => {
    const { animationLoop, backgroundAnimationSpeed, isBackgroundDrawn } = result ?? {} as {
      animationLoop?: [number, number];
      backgroundAnimationSpeed?: number;
      isBackgroundDrawn?: boolean;
    };

    useGlobalStore.setState((state) => {
      state.currentParameterVisibility[targetBackgroundParam] = isBackgroundDrawn ? true : false
      return state;
    });

    if (backgroundAnimationSpeed) {
      setBackgroundAnimationSpeed(backgroundAnimationSpeed);
    }
    if (animationLoop) {
      animationLoopRef.current = animationLoop;
    }
  });

  useEffect(() => {
    if (backgroundAnimationSpeed === 0) {
      return;
    }

    const interval = setInterval(() => {
      const currentParameterStates = useGlobalStore.getState().currentParameterStates;

      if (currentParameterStates[targetBackgroundParam] === undefined) {
        currentParameterStates[targetBackgroundParam] = animationLoopRef.current[0];
      }

      if (currentParameterStates[targetBackgroundParam] >= animationLoopRef.current[1]) {
        currentParameterStates[targetBackgroundParam] = animationLoopRef.current[0];
      }

      currentParameterStates[targetBackgroundParam] += 1;
      console.log('fire',targetBackgroundParam,currentParameterStates[targetBackgroundParam])

      useGlobalStore.setState({
        currentParameterStates: {...currentParameterStates}
      })
    }, backgroundAnimationSpeed * 32);

    return () => clearInterval(interval);
  }, [backgroundAnimationSpeed, targetBackgroundParam]);

  return null;
}

export default Background;