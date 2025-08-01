import useGlobalStore from "../store";

const useScrollSpring = (layerIndex?: number) => {
  return {
    get: () => {
      const {cameraScrollSpring, layerScrollSprings} = useGlobalStore.getState();

      if (layerIndex === undefined) {
        return {
          x: cameraScrollSpring.x.get(),
          y: cameraScrollSpring.y.get(),
        }
      }

      const { x: xSpring, y: ySpring } = layerScrollSprings[layerIndex];

      return {
        x: xSpring.get() + cameraScrollSpring.x.get(),
        y: ySpring.get() + cameraScrollSpring.y.get(),
      }
    }
  }
}

export default useScrollSpring;