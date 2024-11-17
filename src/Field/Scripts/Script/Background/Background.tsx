import { Script } from "../../types";
import { useEffect } from "react";
import useGlobalStore from "../../../../store";
import { useFrame } from "@react-three/fiber";
import { ScriptStateStore } from "../state";

type BackgroundProps = {
  script: Script;
  useScriptStateStore: ScriptStateStore;
};

const Background = ({ script, useScriptStateStore }: BackgroundProps) => {
  const {
    backgroundAnimationSpring,
    isBackgroundVisible
  } = useScriptStateStore();

  useEffect(() => {
    const currentVisibility = useGlobalStore.getState().currentParameterVisibility;
    useGlobalStore.setState({
      currentParameterVisibility: {
        ...currentVisibility,
        [script.backgroundParamId]: isBackgroundVisible
      }
    })

    return () => {
      const currentVisibility = useGlobalStore.getState().currentParameterVisibility;
    
      useGlobalStore.setState({
        ...currentVisibility,
        [script.backgroundParamId]: false,
      })
    }
  }, [script.backgroundParamId, isBackgroundVisible]);

  useFrame(() => {
    const frame = Math.floor(backgroundAnimationSpring.get());
    const currentParameterStates = useGlobalStore.getState().currentParameterStates;

    if (currentParameterStates[script.backgroundParamId] === frame) {
      return;
    }

    useGlobalStore.setState({
      currentParameterStates: {
        ...currentParameterStates,
        [script.backgroundParamId]: frame
      }
    })
  });

  return null;
}

export default Background;