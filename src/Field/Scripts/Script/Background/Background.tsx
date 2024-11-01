import { Script, ScriptState } from "../../types";
import { useEffect } from "react";
import useGlobalStore from "../../../../store";

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

  return null;
}

export default Background;