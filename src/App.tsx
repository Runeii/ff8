import './index.css'
import { Canvas } from '@react-three/fiber'

import { ASPECT_RATIO } from './constants/constants'
import Controller from './Controller/Controller'
import useGlobalStore from './store'
import Ui from './UI/UI'
import Entrypoint from './Entrypoint'
import { useEffect, useState } from 'react'
import Memory from './Memory/Memory'
import { PerspectiveCamera } from '@react-three/drei'
import Queues from './Queues/Queues'
import ColorOverlay from './ColorOverlay/ColorOverlay'
import { EffectComposer } from '@react-three/postprocessing'
import useIsTabActive from './useIsTabActive'
import { MEMORY } from './Field/Scripts/Script/handlers'
import MAP_NAMES from './constants/maps'
import { Scene } from 'three'

const requestedProgress = new URLSearchParams(window.location.search).get('progress');
if (requestedProgress) {
  MEMORY[256] = parseInt(requestedProgress, 10);
}

const namedField = new URLSearchParams(window.location.search).get('field');
if (namedField) {
  useGlobalStore.setState({
    pendingFieldId: namedField as typeof MAP_NAMES[number]
  })
}
export default function App() {
  const isTabActive = useIsTabActive();

  const fieldId = useGlobalStore(state => state.fieldId);
  const progress = MEMORY[256];
  const isDebugMode = useGlobalStore(state => state.isDebugMode);

  useEffect(() => {
    if (!fieldId) {
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set('field', fieldId);
    const progress = MEMORY[256] ?? 0

    url.searchParams.set('progress', progress.toString());
    window.history.pushState({}, '', url.toString());
  }, [fieldId, progress])

  const [worldScene, setWorldScene] = useState<Scene>();

  return (
    <>
      <div className="container">
        <Canvas camera={undefined} className="canvas" gl={{
          logarithmicDepthBuffer: true,
          antialias: false,
          alpha: false,
          depth: false,
          stencil: false,
        }} frameloop={isTabActive ? 'demand' : 'never'}>
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
            <Entrypoint setWorldScene={setWorldScene} />
            <ColorOverlay />
          </EffectComposer>
        </Canvas>
        <Canvas
          camera={undefined}
          className="canvas" 
          shadows={false}
          dpr={window.devicePixelRatio}
          gl={{
            antialias: false,
            alpha: true,
            depth: false,
            stencil: false,
            powerPreference: "high-performance"
          }}
          linear={true}
          flat={true}
          frameloop={isTabActive ? 'demand' : 'never'}
        >
          <Ui worldScene={worldScene} />
        </Canvas>
        {isDebugMode && <Queues />}
        {isDebugMode && <Memory />}
      </div>
      <Controller />
    </>
  )
}