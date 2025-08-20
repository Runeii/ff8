import { generateUUID } from 'three/src/math/MathUtils.js';
import { OpcodeObj } from '../Field/Scripts/types';
import styles from './Debugger.module.css';
import { useEffect, useMemo, useState } from "react";
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import Layer from '../Field/Background/Layer/Layer';
import { Vector3 } from 'three';

type Log = {
  uuid: string
  timestamp: number;
  id: number;
  methodId: string;
  index: number;
  opcode: OpcodeObj
}

async function blobToCanvasModern(blob?: Blob): Promise<HTMLCanvasElement> {
    if (!blob) {
        throw new Error('No blob provided');
    }
    const imageBitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('Failed to get canvas 2D context');
    }

    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;
    ctx.drawImage(imageBitmap, 0, 0);
    
    return canvas;
}

const channel = new BroadcastChannel('debugger');
const Debugger = () => {
  const [storeState, setStoreState] = useState<string>('');
  const [scriptStates, setScriptStates] = useState<Record<number, string>>({});
  const [log, setLog] = useState<Log[]>([]);

  const [layers, setLayers] = useState<Record<number, Layer>>({});

  useEffect(() => {
    channel.onmessage = async (event) => {
      const {type, payload: jsonPayload, blob} =  event.data as { type: string, payload: string, blob?: Blob };
      const payload = JSON.parse(jsonPayload ?? '{}')

      if (type === 'state') {
        setStoreState(payload);
      }
      if (type === 'script-state') {
        setScriptStates((prev) => ({
          ...prev,
          [payload.id]: {
            // @ts-expect-error CBA typing debug
            ...(prev[payload.id] || {}),
            ...payload.state
          }
        }));
      }
      if (type === 'opcode') {
        setLog(state => [
          ...state,
          {
            uuid: generateUUID(),
            timestamp: Date.now(),
            id: payload.id,
            methodId: payload.methodId,
            index: payload.index,
            opcode: payload.opcode
          }
        ])
      }
      if (type === 'layers') {
        const canvas = await blobToCanvasModern(blob);
        setLayers(prev => ({
          ...prev,
          [payload.id]: {
            ...payload,
            index: payload.index,
            canvas: canvas
          }
        }))
      }
      if (type === 'reset') {
        setStoreState('');
        setScriptStates({});
        setLog([]);
        setLayers({});
      }
    };
  }, []);

  const [view, setView] = useState<'state' | 'script-state' | 'logs' | 'layers'>('state');
  const [scriptId, setScriptId] = useState<number | null>(null);

  const [visibleLogScriptId, setVisibleLogScriptId] = useState<number | null>(null);
  const availableLogScriptIds = useMemo(() => {
    return Array.from(new Set(log.map(entry => entry.id)))
  }, [log]);

  const visibleLogs = useMemo(() => {
    return log.filter(entry => visibleLogScriptId === null || entry.id === visibleLogScriptId).sort((a, b) => a.timestamp - b.timestamp);
  }, [log, visibleLogScriptId]);

  useEffect(() => {
    const layersEl = document.getElementById('layers');
    if (layersEl) {
      layersEl.innerHTML = '';
      Object.values(layers).sort((a, b) => b.index - a.index).forEach(layer => {
        const layerEl = document.createElement('div');
        layerEl.className = styles.layer;
        layerEl.appendChild(layer.canvas);
        const title = document.createElement('h3');
        title.textContent = `${layer.id}`;
        layerEl.appendChild(title);
        layersEl.appendChild(layerEl);
      });
    }
  }, [layers, view]);

  return (
    <div className={styles.debugger}>
      <div className={styles.menu}>
        <button onClick={() => setView('state')}>State</button>
        <button onClick={() => setView('logs')}>Logs</button>
        <button onClick={() => setView('layers')}>Layers</button>
        {Object.entries(scriptStates).map(([id]) => (
          <button key={id} onClick={() => {
            setView('script-state')
            setScriptId(Number(id));
          }}>{`Script ${id}`}</button>
        ))}
      </div>
      <div className={styles.submenu}>
        {view === 'logs' && (
          <>
            <button onClick={() => setVisibleLogScriptId(null)}>All Entities</button>
            {availableLogScriptIds.map(id => (
              <button key={id} onClick={() => setVisibleLogScriptId(id)}>
                {`Entity ${id}`}
              </button>
            ))}
          </>
        )}
      </div>
      <div className={styles.content}>
        {view === 'logs' && (
          <div className={styles.logs}>
          {visibleLogs.map(entry => (
            <div key={`${entry.uuid}`} className={styles.log}>
              <div className={styles.logTimestamp}>{entry.timestamp}</div>
              <div className={styles.actor}>{`Actor ${entry.id}`}</div>
              <div className={styles.method}>{`Method ${entry.methodId}`}</div>
              <div className={styles.index}>{`Index ${entry.index}`}</div>
              <div className={styles.opcode}>{`Opcode ${entry.opcode.name} param ${entry.opcode.param}`}</div>
            </div>
          ))}
        </div>
        )}
        {view === 'state' && <pre>{JSON.stringify(storeState, null, 2)}</pre>}
        {view === 'script-state' && scriptId !== null && (
          <pre>{JSON.stringify(scriptStates[scriptId], null, 2)}</pre>
        )}
        {view === 'layers' && (
          <>
          <Canvas className={styles.canvas} camera={{
            position: [0, 0, 5]
          }}>
            <ambientLight intensity={10} />
            <OrbitControls />
            <PerspectiveCamera name="sceneCamera" makeDefault userData={{
              initialPosition: new Vector3(0, 0, 0),
              initialTargetPosition: new Vector3(0, 0, 1)
            }} />
            {Object.values(layers).map((layer) => <Layer key={layer.id} layer={layer} backgroundPanRef={{current: {
              boundaries: {
                left: 120,
                right: 120,
                bottom: 120,
                top: 120,
              },
              panX: 0,
              panY: 0
            }}} />)}
          </Canvas>
          <div>
            <h2>Layer Debug Info</h2>
            <div id="layers" className={styles.layers} /> 
            <pre>{JSON.stringify(layers, null, 2)}</pre>
          </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Debugger;