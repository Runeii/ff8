import './index.css'
import { Canvas } from '@react-three/fiber'

import { ASPECT_RATIO } from './constants/constants'
import Controller from './Controller/Controller'
import useGlobalStore from './store'
import Ui from './UI/UI'
import Entrypoint from './Entypoint'
import { Suspense, useEffect } from 'react'
import { Perf } from 'r3f-perf'
import Memory from './Memory/Memory'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import Queues from './Queues/Queues'
import { useSpring } from '@react-spring/web'
import { attachKeyDownListeners } from './Field/Scripts/Script/common'
import { getInitialField } from './utils'
import MAP_NAMES from './constants/maps'
import FieldLoader from './Field/Field'

const hasNamedField = new URLSearchParams(window.location.search).get('field');

useGlobalStore.setState({
  pendingFieldId: (getInitialField() ?? 'wm00') as typeof MAP_NAMES[number], 
});

const SuspenseMonitor = () => {
  useEffect(() => {
    useGlobalStore.setState({
      isMapSuspended: true,
    });

    return () => {
      useGlobalStore.setState({
        isMapSuspended: false,
      });
    }
  }, []);

  return null;
}

export const FADE_DURATION = 1000;
export default function App() {
  const fieldId = useGlobalStore(state => state.fieldId);
  const isDebugMode = useGlobalStore(state => state.isDebugMode);

  useEffect(() => {
    if (!hasNamedField) {
      return;
    }
    window.history.pushState({}, '', `?field=${fieldId}`);
  }, [fieldId])

  useEffect(() => {
    attachKeyDownListeners();
  }, []);

  const isMapFadeEnabled = useGlobalStore(state => state.isMapFadeEnabled);

  const [{opacity}] = useSpring(() => ({
    opacity: 1,
    config: {
      duration: FADE_DURATION,
    },
    immediate: isMapFadeEnabled,
  }), [isMapFadeEnabled]);

  useEffect(() => {
    useGlobalStore.setState({
      canvasOpacitySpring: opacity,
    })
  }, [opacity])

  return (
    <>
      <div className="container">
        <Canvas camera={undefined} frameloop='always' className="canvas" gl={{
          logarithmicDepthBuffer: true,
        }}>
          <PerspectiveCamera
            makeDefault
            name="moveableCamera"
            position={[0, 0, 0]}
            aspect={ASPECT_RATIO}
            near={0.001}
            far={1000}
          />
          <OrbitControls />
          <PerspectiveCamera
            name="sceneCamera"
            position={[0, 0, 0]}
            aspect={ASPECT_RATIO}
            near={0.001}
            far={1000}
          />
          <Suspense fallback={<SuspenseMonitor />}>
            <FieldLoader opacitySpring={opacity} />
          </Suspense>
          {isDebugMode && <Perf />}
          <Ui />
        </Canvas>
        {isDebugMode && <Queues />}
        {isDebugMode && <Memory />}
      </div>
      <Controller />
    </>
  )
}