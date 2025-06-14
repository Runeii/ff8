import { Suspense, useEffect } from "react"
import useGlobalStore from "./store";
import FieldLoader from "./Field/Field";
import { useSpring } from "@react-spring/web";
import { attachKeyDownListeners } from "./Field/Scripts/Script/common";
import { getInitialField } from "./utils";
import MAP_NAMES from "./constants/maps";


useGlobalStore.setState({
  pendingFieldId: (getInitialField() ?? 'wm00') as typeof MAP_NAMES[number], 
});

const Entrypoint = () => {
  useEffect(() => {
    attachKeyDownListeners();
  }, []);

  const isMapFadeEnabled = useGlobalStore(state => state.isMapFadeEnabled);

  const [{opacity}] = useSpring(() => ({
    opacity: 1,
    config: {
      duration: 1000,
    },
    immediate: isMapFadeEnabled,
    onChange: ({ value }) => {
      document.body.style.setProperty('--canvas-opacity', value.opacity);
    }
  }), [isMapFadeEnabled]);

  useEffect(() => {
    useGlobalStore.setState({
      canvasOpacitySpring: opacity,
    })
  }, [opacity])

  return (
    <>
      <Suspense>
        <FieldLoader opacitySpring={opacity} />
      </Suspense>
    </>
  )
}

export default Entrypoint;