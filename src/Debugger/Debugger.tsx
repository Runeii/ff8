import { generateUUID } from 'three/src/math/MathUtils.js';
import { OpcodeObj } from '../Field/Scripts/types';
import styles from './Debugger.module.css';
import { useEffect, useMemo, useState } from "react";
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import Layer from '../Field/Background/Layer/Layer';
import { Vector3 } from 'three';

type Log = {
  id: number;
  uuid: string;
  opcode: string
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
  const [scriptControllerStates, setScriptControllerStates] = useState<Record<number, string>>({});
  const [log, setLog] = useState<Record<number, Log[]>>({});

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
      if (type === 'script-controller-state') {
        console.log('got state', payload);
        setScriptControllerStates(state => ({
          ...state,
          [payload.script.groupId]: payload,
        }));
      }
      if (type === 'command') {
        setLog(state => ({
          ...state,
          [payload.id]: [
            ...(state[payload.id] ?? []),
            {
              id: payload.id,
              uuid: payload.uuid,
              opcode: payload.opcode,
            }
          ]
        }));
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
      <div className={styles.content}>
        {view === 'logs' && (
          <div className={styles.logs}>
          {Object.values(log).flat().map(entry => (
            <div key={`${entry.uuid}`} className={styles.log}>
              <div className={styles.actor}>{`Actor ${entry.id}`}</div>
              <div className={styles.opcode}>{`Opcode ${entry.opcode}`}</div>
            </div>
          ))}
        </div>
        )}
        {view === 'state' && <pre>{JSON.stringify(storeState, null, 2)}</pre>}
        {view === 'script-state' && scriptId !== null && (
          <>
          <pre>Script state: {JSON.stringify(scriptStates[scriptId], null, 2)}</pre>
          <pre>Script controller state: {JSON.stringify(scriptControllerStates[scriptId], null, 2)}</pre>
          <pre>Logs: {JSON.stringify(log[scriptId], null, 2)}</pre>
          </>
        )}
        {view === 'layers' && (
          <>
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