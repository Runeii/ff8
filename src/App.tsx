import './index.css'
import { Canvas } from '@react-three/fiber'

import { ASPECT_RATIO } from './constants/constants'
import Controller from './Controller/Controller'
import useGlobalStore from './store'
import Ui from './UI/UI'
import Entrypoint from './Entrypoint'
import { useEffect } from 'react'
import Memory from './Memory/Memory'
import { PerspectiveCamera } from '@react-three/drei'
import Queues from './Queues/Queues'
import ColorOverlay from './ColorOverlay/ColorOverlay'
import { EffectComposer } from '@react-three/postprocessing'

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
          <EffectComposer>
            <PerspectiveCamera
              makeDefault
              name="moveableCamera"
              position={[0, 0, 0]}
              aspect={ASPECT_RATIO}
              near={0.001}
              far={1000}
            />
            <PerspectiveCamera
              name="sceneCamera"
              position={[0, 0, 0]}
              aspect={ASPECT_RATIO}
              near={0.001}
              far={1000}
            />
            <Entrypoint />
            <ColorOverlay />
            <Ui />
          </EffectComposer>
        </Canvas>
        {isDebugMode && <Queues />}
        {isDebugMode && <Memory />}
      </div>
      <Controller />
    </>
  )
}