import { Suspense, useEffect } from "react"
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

  useFrame(() => {
    document.body.style.setProperty('--canvas-opacity', fadeSpring.get().toString());
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