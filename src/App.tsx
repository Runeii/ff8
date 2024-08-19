import './index.css'
import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import Field from './Field/Field'
import Character from './Character/Character'

window.debug = {} as Record<string, string>;

export default function App() {
  const [field, setField] = useState('dotown2a')
  const [characterPosition, setCharacterPosition] = useState({
    x: 94,
    y: 386,
    z: 1120
  })

  const [strings, setStrings] = useState({})

  useEffect(() => {
    const interval = setInterval(() => {
      setStrings(Object.values(window.debug));
    }, 25)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
    <Canvas camera={{
      aspect: 320 / 224,
      near: 0.001,
      far: 40,
    }} className="canvas" >
      <ambientLight />
      <Suspense>
        <Character position={characterPosition} />
        <Field id={field} setField={setField} setCharacterPosition={setCharacterPosition} />
      </Suspense>
    </Canvas>
    <div className="debug"> 
      {Object.values(strings).map((value, index) => (
        <div key={index}>{value}</div>
      ))}
    </div>
    </>
  )
}