import { Script, ScriptState } from "../../types";
import { useEffect } from "react";
import useGlobalStore from "../../../../store";
import { useFrame } from "@react-three/fiber";

type BackgroundProps = {
  script: Script;
  state: ScriptState;
};

const Background = ({ script, state }: BackgroundProps) => {
  useEffect(() => {
    const currentVisibility = useGlobalStore.getState().currentParameterVisibility;
    useGlobalStore.setState({
      currentParameterVisibility: {
        ...currentVisibility,
        [script.backgroundParamId]: state.isBackgroundVisible
      }
    })
    return () => {
      const currentVisibility = useGlobalStore.getState().currentParameterVisibility;
    
      useGlobalStore.setState({
        ...currentVisibility,
        [script.backgroundParamId]: false,
      })
    }
  }, [script.backgroundParamId, state.isBackgroundVisible]);

  useFrame(() => {
    const frame = Math.floor(state.backgroundAnimationSpring.get());
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