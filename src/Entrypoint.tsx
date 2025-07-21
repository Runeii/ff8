import { Suspense, useEffect, useRef } from "react"
import useGlobalStore from "./store";
import FieldLoader from "./Field/Field";
import { attachKeyDownListeners } from "./Field/Scripts/Script/common";
import { getInitialField } from "./utils";
import MAP_NAMES from "./constants/maps";
import { useFrame } from "@react-three/fiber";


useGlobalStore.setState({
  pendingFieldId: (getInitialField() ?? 'wm00') as typeof MAP_NAMES[number], 
});

const Entrypoint = () => {
  useEffect(() => {
    attachKeyDownListeners();
  }, []);

  const fadeSpring = useGlobalStore(state => state.fadeSpring);

  const currentStyleRef = useRef<number>(0);
  useFrame(() => {
    const isMapFadeEnabled = useGlobalStore.getState().isMapFadeEnabled;
    if (!isMapFadeEnabled) {
      return;
    }
    const currentStyle = fadeSpring.get();
    if (currentStyleRef.current === currentStyle) {
      return;
    }
    currentStyleRef.current = currentStyle;
    document.body.style.setProperty('--canvas-opacity', currentStyle.toString());
  })

  return (
    <>
      <Suspense>
        <FieldLoader />
      </Suspense>
    </>
  )
}

export default Entrypoint;