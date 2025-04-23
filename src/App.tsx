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
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import Queues from './Queues/Queues'

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
        <Canvas camera={undefined} frameloop='always' className="canvas" gl={{
          logarithmicDepthBuffer: true,
        }}>
          <PerspectiveCamera
            makeDefault
            name="moveableCamera"
            position={[0, 0, 0]}
            aspect={ASPECT_RATIO}
            near={0.001}
            far={1000}
          />
          <OrbitControls />
          <PerspectiveCamera
            name="sceneCamera"
            position={[0, 0, 0]}
            aspect={ASPECT_RATIO}
            near={0.001}
            far={1000}
          />
          <Entrypoint />
          {isDebugMode && <Perf />}
          <Ui />
        </Canvas>
        {isDebugMode && <Queues />}
        {isDebugMode && <Memory />}
      </div>
      <Controller />
    </>
  )
}