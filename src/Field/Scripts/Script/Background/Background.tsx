import { Script, ScriptState } from "../../types";
import { useEffect } from "react";
import useGlobalStore from "../../../../store";

type BackgroundProps = {
  script: Script;
  state: ScriptState;
};

const Background = ({ script, state }: BackgroundProps) => {
  const targetBackgroundParam = script.backgroundParamId;

  useEffect(() => {
    useGlobalStore.setState((storeState) => {
      storeState.currentParameterVisibility[script.backgroundParamId] = state.isBackgroundVisible;
      return storeState;
    });

    return () => {
      useGlobalStore.setState((storeState) => {
        delete storeState.currentParameterVisibility[script.backgroundParamId];
        return storeState;
      });
    }
  }, [script.backgroundParamId, state.isBackgroundVisible]);

  useEffect(() => {
    if (state.backgroundAnimationSpeed === 0) {
      return;
    }

    const isLooping = state.isBackgroundLooping;
    const startFrame = state.backgroundStartFrame;
    const endFrame = state.backgroundEndFrame

    const interval = setInterval(() => {
      const currentParameterStates = useGlobalStore.getState().currentParameterStates;
      let thisParameter = currentParameterStates[targetBackgroundParam];

      if (!thisParameter || thisParameter >= endFrame) {
        thisParameter = startFrame;
      }

      thisParameter += 1;

      useGlobalStore.setState({
        currentParameterStates: {
          ...currentParameterStates,
          [targetBackgroundParam]: thisParameter
        }
      })

      if (thisParameter === endFrame && !isLooping) {
        clearInterval(interval);
      }
    }, state.backgroundAnimationSpeed * 32);

    return () => clearInterval(interval);
  }, [script.backgroundParamId, state.backgroundEndFrame, state.backgroundAnimationSpeed, state.backgroundStartFrame, state.isBackgroundLooping, targetBackgroundParam]);

  return null;
}

export default Background;