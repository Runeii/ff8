import './index.css'
import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import Field from './Field/Field'
import Character from './Character/Character'

import { ASPECT_RATIO } from './constants'
import { getInitialEntrance, getInitialField } from './utils'


export default function App() {
  const [field, setField] = useState(getInitialField())
  const [characterPosition, setCharacterPosition] = useState(getInitialEntrance(field))

  useEffect(() => {
    window.history.pushState({}, '', `?field=${field}`);
  }, [field])

  return (
    <Canvas camera={{
      aspect: ASPECT_RATIO,
      near: 0.001,
      far: 40,
    }} className="canvas" >
      <ambientLight />
      <Suspense>
        <Character position={characterPosition} />
        <Field id={field} setField={setField} setCharacterPosition={setCharacterPosition} />
      </Suspense>
    </Canvas>
  )
}