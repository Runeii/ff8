import './index.css'
import { Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import Field from './Field/Field'

import { ASPECT_RATIO } from './constants/constants'
import { animated, useSpring } from '@react-spring/web'
import Controller from './Controller/Controller'
import useGlobalStore from './store'
import {getInitialField} from './utils'
import Ui from './UI/UI'
import WorldMap from './WorldMap/WorldMap'
import { attachKeyDownListeners } from './Field/Scripts/Script/common'
import { Perf } from 'r3f-perf'
import MAP_NAMES from './constants/maps'
import Memory from './Memory/Memory'
import PSXRenderer from './PSXRenderer/PSXRenderer'

const hasNamedField = new URLSearchParams(window.location.search).get('field');

attachKeyDownListeners();

useGlobalStore.setState({
  pendingFieldId: (getInitialField() ?? 'wm00') as typeof MAP_NAMES[number], 
});

export default function App() {
  const fieldId = useGlobalStore(state => state.fieldId);

  useEffect(() => {
    if (!hasNamedField) {
      return;
    }
    window.history.pushState({}, '', `?field=${fieldId}`);
  }, [fieldId])

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

  const isDebugMode = useGlobalStore(state => state.isDebugMode);
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
    <animated.div className="container" style={{opacity}}>
      <Canvas camera={{
        aspect: ASPECT_RATIO,
        near: 0.0001,
        far: 100,
      }} className="canvas">
        {isDebugMode && <Perf />}
        <PSXRenderer />
        <Suspense>
          {fieldId === 'wm00' ? <WorldMap /> : <Field opacitySpring={opacity} />}
        </Suspense>
      </Canvas>
      <Ui />
      {isDebugMode && <Memory />}
      </animated.div>
    <Controller />
    </>
  )
}