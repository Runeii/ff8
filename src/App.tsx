import './index.css'
import { Suspense, useCallback, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import Field from './Field/Field'

import { ASPECT_RATIO } from './constants/constants'
import { animated, useSpring } from '@react-spring/web'
import Controller from './Controller/Controller'
import useGlobalStore from './store'
import {getInitialField} from './utils'
import Ui from './UI/UI'
import WorldMap from './WorldMap/WorldMap'

const hasNamedField = new URLSearchParams(window.location.search).get('field');

useGlobalStore.setState({
  fieldId: getInitialField()
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
  const [spring, setSpring] = useSpring(() => ({
    opacity: 0,
    config: {
      duration: 1000,
    },
    immediate: isMapFadeEnabled,
  }), [isMapFadeEnabled]);

  const asyncSetSpring = useCallback(async (opacity: number) => {
    if (spring.opacity.get() === opacity) {
      return;
    }
    return new Promise((resolve) => {
      setSpring({
        opacity,
        onRest: resolve
      })
    })
  }, [setSpring, spring.opacity]);

  useEffect(() => {
    useGlobalStore.setState({
      fadeSpring: spring,
    })
  }, [spring])

  return (
    <>
    <animated.div className="container" style={spring}>
      <Canvas camera={{
        aspect: ASPECT_RATIO,
        near: 0.001,
        far: 40,
      }} className="canvas">
        <ambientLight />
        <Suspense>
          {fieldId === 'WORLD_MAP' ? <WorldMap /> : <Field setSpring={asyncSetSpring} />}
        </Suspense>
        <Ui />
      </Canvas>
      </animated.div>
    <Controller />
    </>
  )
}