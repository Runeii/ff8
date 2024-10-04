import './index.css'
import { Suspense, useCallback, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import Field from './Field/Field'

import { ASPECT_RATIO } from './constants'
import {  getInitialField } from './utils'
import { animated, useSpring } from '@react-spring/web'
import Controller from './Controller/Controller'

const hasNamedField = new URLSearchParams(window.location.search).get('field');

export default function App() {
  const [field, setField] = useState(getInitialField())

  useEffect(() => {
    if (!hasNamedField) {
      return;
    }
    window.history.pushState({}, '', `?field=${field}`);
  }, [field])

  const [spring, setSpring] = useSpring(() => ({
    opacity: 0,
    position: 'relative',
    config: {
      duration: 500
    }
  }), []);

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

  return (
    <>
    <animated.div style={spring}>
      <Canvas camera={{
        aspect: ASPECT_RATIO,
        near: 0.001,
        far: 40,
      }} className="canvas">
        <ambientLight />
        <Suspense>
          <Field id={field} setField={setField} setSpring={asyncSetSpring} />
        </Suspense>
      </Canvas>
    </animated.div>
    <Controller />
    </>
  )
}