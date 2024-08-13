import './index.css'
import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import Field from './Field/Field'
import Character from './Character/Character'

export default function App() {
  const [field, setField] = useState<string>('dotown3a')
  const [characterPosition, setCharacterPosition] = useState({
    x: -180,
    y: -20,
    z: 2
  })

  return (
    <Canvas camera={{
      aspect: 320 / 240,
      near: 0.001,
      far: 1000000,
    }} className="canvas">
      <ambientLight />
      <Suspense>
        <Character position={characterPosition} />
        <Field
          id={field}
          setField={setField}
          setCharacterPosition={setCharacterPosition}
        />
      </Suspense>
    </Canvas>
  )
}