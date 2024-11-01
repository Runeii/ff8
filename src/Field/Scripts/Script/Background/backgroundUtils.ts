import useGlobalStore from "../../../../store";

export const animateFrames = (backgroundId: number, startFrame: number, endFrame: number, speed: number, isLooping: boolean) => new Promise<void>((resolve) => {
  const { fieldTimestamp } = useGlobalStore.getState();
  const interval = setInterval(() => {
    const currentParameterStates = useGlobalStore.getState().currentParameterStates;
    let thisParameter = currentParameterStates[backgroundId];

    if (!thisParameter || thisParameter >= endFrame) {
      thisParameter = startFrame;
    }

    thisParameter += 1;

    useGlobalStore.setState({
      currentParameterStates: {
        ...currentParameterStates,
        [backgroundId]: thisParameter
      }
    })

    const timeStampNow = useGlobalStore.getState().fieldTimestamp;
    if ((thisParameter === endFrame && !isLooping) || fieldTimestamp !== timeStampNow) {
      clearInterval(interval);
      resolve();
    }
  }, speed * (1000 / 30));
});