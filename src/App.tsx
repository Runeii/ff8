import './index.css'
import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import Field from './Field/Field'
import Character from './Character/Character'

window.debug = {} as Record<string, string>;

window.debug.x = 0;
window.debug.y = 0;

import exits from '../public/exits.json';
const initialField = new URLSearchParams(window.location.search).get('field') || 'bghall_5';
const entrance = exits[initialField]?.[0] || {
  "x": -0.1180252408915847,
  "y": 0.24768221206328023,
  "z": 0.027119858250365655
}

export default function App() {
  const [field, setField] = useState(initialField)
  const [characterPosition, setCharacterPosition] = useState(entrance)

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
      <input type="number" min={-400} max={400} step={1} value={window.debug.x} onChange={(e) => {
        window.debug.x = parseInt(e.target.value)
      }} />
      <input type="number" min={-400} max={400} step={1} value={window.debug.y} onChange={(e) => {
        window.debug.y = parseInt(e.target.value)
      }} />
    </div>
    </>
  )
}