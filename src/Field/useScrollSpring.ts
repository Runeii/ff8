import useGlobalStore from "../store";

const useScrollSpring = (layerIndex: number) => {
  return {
    get: () => {
      const {cameraAndLayerScrollSprings} = useGlobalStore.getState();

      const { x: xSpring, y: ySpring } = cameraAndLayerScrollSprings[layerIndex];
      if (layerIndex === 0) {
        return {
          x: xSpring.get(),
          y: ySpring.get(),
        }
      }
      
      const cameraSpring = cameraAndLayerScrollSprings[0];

      return {
        x: xSpring.get() + cameraSpring.x.get(),
        y: ySpring.get() + cameraSpring.y.get(),
      }
    }
  }
}

export default useScrollSpring;