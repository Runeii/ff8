import './index.css'
import { Canvas } from '@react-three/fiber'

import { ASPECT_RATIO } from './constants/constants'
import Controller from './Controller/Controller'
import useGlobalStore from './store'
import Ui from './UI/UI'
import Entrypoint from './Entypoint'
import { useEffect } from 'react'
import { Perf } from 'r3f-perf'
import Memory from './Memory/Memory'

const hasNamedField = new URLSearchParams(window.location.search).get('field');

export default function App() {
  const fieldId = useGlobalStore(state => state.fieldId);
  const isDebugMode = useGlobalStore(state => state.isDebugMode);

  useEffect(() => {
    if (!hasNamedField) {
      return;
    }
    window.history.pushState({}, '', `?field=${fieldId}`);
  }, [fieldId])

  return (
    <>
      <div className="container">
        <Canvas camera={{
          aspect: ASPECT_RATIO,
          near: 0.0001,
          far: 100,
        }} className="canvas">
          <Entrypoint />
          {isDebugMode && <Perf />}
        </Canvas>
          {isDebugMode && <Memory />}
          <Ui />
      </div>
      <Controller />
    </>
  )
}