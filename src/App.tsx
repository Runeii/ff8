import './index.css'
import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import Field from './Field/Field'

import { ASPECT_RATIO } from './constants'
import {  getInitialField } from './utils'


export default function App() {
  const [field, setField] = useState(getInitialField())

  useEffect(() => {
    window.history.pushState({}, '', `?field=${field}`);
  }, [field])

  return (
    <Canvas camera={{
      aspect: ASPECT_RATIO,
      near: 0.001,
      far: 40,
    }} className="canvas">
      <ambientLight />
      <Suspense>
        <Field id={field} setField={setField} />
      </Suspense>
    </Canvas>
  )
}