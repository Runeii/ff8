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

const hasNamedField = new URLSearchParams(window.location.search).get('field');

attachKeyDownListeners();

useGlobalStore.setState({
  pendingFieldId: getInitialField()
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

  return (
    <>
    <animated.div className="container" style={{opacity}}>
      <Canvas camera={{
        aspect: ASPECT_RATIO,
        near: 0.0001,
        far: 5,
      }} className="canvas">
      <Perf />
        <Suspense>
          {fieldId === 'WORLD_MAP' ? <WorldMap /> : <Field opacitySpring={opacity} />}
        </Suspense>
        <Ui />
      </Canvas>
      </animated.div>
    <Controller />
    </>
  )
}