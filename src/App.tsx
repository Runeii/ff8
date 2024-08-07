import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import Field from './Field/Field'
import Character from './Character/Character'


export default function App() {
  const [field, setField] = useState('dotown1a')
  const [characterPosition, setCharacterPosition] = useState({
    x: -180,
    y: -20,
    z: 2
  })

  return (
    <Canvas camera={{
      near: 0.001,
      far: 1000000,
      aspect: 320 / 224,
    }} style={{
      aspectRatio: 320 / 224,
      height: 'auto'
    }}>
      <ambientLight />
      <Suspense>
        <Character position={characterPosition} />
        <Field id={field} setField={setField} setCharacterPosition={setCharacterPosition} />
      </Suspense>
    </Canvas>
  )
}