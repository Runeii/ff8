import { useSpring } from "@react-spring/web";
import useGlobalStore from "../store";

const useScrollSpring = (layerIndex: number) => {
  const { cameraAndLayerTransitioning, cameraAndLayerStartXY, cameraAndLayerEndXY, cameraAndLayerDurations } = useGlobalStore();

  const [spring] = useSpring(() => ({
    from : {
      x: cameraAndLayerStartXY[layerIndex]?.x ?? 0,
      y: cameraAndLayerStartXY[layerIndex]?.y ?? 0,
    },
    to: {
      x: cameraAndLayerEndXY[layerIndex]?.x ?? 0,
      y: cameraAndLayerEndXY[layerIndex]?.y ?? 0,
    },
    config: {
      duration: cameraAndLayerDurations[layerIndex] / 30 * 1000,
      precision: 0.01
    },
    onStart: () => {
      useGlobalStore.setState({
        cameraAndLayerTransitioning: cameraAndLayerTransitioning.map((value, index) => index === layerIndex ? true : value)
      })
    },
    onRest: () => {
      const currentCameraAndLayerTransitioning = useGlobalStore.getState().cameraAndLayerTransitioning;
      if (layerIndex === 0) {
        useGlobalStore.setState({
          cameraAndLayerTransitioning: currentCameraAndLayerTransitioning.map(() => false)
        })

        return;
      }
      
      useGlobalStore.setState({
        cameraAndLayerTransitioning: currentCameraAndLayerTransitioning.map((value, index) => index === layerIndex ? false : value)
      })
    }
  }), [cameraAndLayerStartXY, cameraAndLayerEndXY, cameraAndLayerDurations, layerIndex]);

  return spring;
}

export default useScrollSpring;