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
  const fieldId = useGlobalStore(state => state.fieldId);

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
  }), [isMapFadeEnabled]);

  useEffect(() => {
    useGlobalStore.setState({
      canvasOpacitySpring: opacity,
    })
  }, [opacity])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        useGlobalStore.setState({
          isDebugMode: !useGlobalStore.getState().isDebugMode,
        })
      }
    }
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    }
  }, [])

  return (
    <>
      <Suspense>
        <FieldLoader opacitySpring={opacity} />
      </Suspense>
    </>
  )
}

export default Entrypoint;