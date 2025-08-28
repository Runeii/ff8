import styles from './Debugger.module.css';
import { useEffect, useState } from "react";

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
  const [logByScript, setLogByScript] = useState<Record<number, Log[]>>({});
  const [log, setLog] = useState<Log[]>([]);
  const [setupStates, setSetupStates] = useState<Record<number, string[]>>({});
  const [queue, setQueue] = useState<Record<number, Log[]>>({});

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
      if (type === 'setup-state') {
        setSetupStates((prev) => ({
          ...prev,
          [payload.state]: [
            ...(prev[payload.state] ?? []),
            payload.value
          ]
        }));
      }
      if (type === 'command') {
        setLog(state => ([
          ...state,
          {
            id: payload.id,
            uuid: payload.uuid,
            opcode: payload.opcode,
          }
        ]));
        setLogByScript(state => ({
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
      if (type === 'queue') {
        setQueue(state => ({
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
        setQueue({});
        setSetupStates({});
      }
    };
  }, []);

  const [view, setView] = useState<'state' | 'setup-states' | 'queue' | 'script-state' | 'logs' | 'layers'>('state');
  const [scriptId, setScriptId] = useState<number | null>(null);

  useEffect(() => {
    const layersEl = document.getElementById('layers');
    if (layersEl) {
      layersEl.innerHTML = '';
      // @ts-expect-error CBA typing debug
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
        <button onClick={() => setView('setup-states')}>Setup States</button>
        <button onClick={() => setView('logs')}>Logs</button>
        <button onClick={() => setView('queue')}>Queue</button>
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
          {log.map(entry => (
            <div key={`${entry.uuid}`} className={styles.log}>
              <div className={styles.actor}>{`Actor ${entry.id}`}</div>
              <div className={styles.opcode}>{`Opcode ${entry.opcode}`}</div>
            </div>
          ))}
        </div>
        )}
        {view === 'setup-states' && (
          <>
          {Object.entries(setupStates).map(([id, states]) => (
            <div key={id}>
              <h4>{`Script ${id}`}</h4>
              <pre>{JSON.stringify(states, null, 2)}</pre>
            </div>
          ))}
          </>
        )}
        {view === 'state' && <pre>{JSON.stringify({
          // @ts-expect-error CBA typing debug
          ...storeState,
          availableMessages: 'blanked out',
          walkmesh: 'blanked out',
          walkmeshController: 'blanked out',
          congaWaypointHistory: 'blanked out'
        }, null, 2)}</pre>}
        {view === 'script-state' && scriptId !== null && (
          <>
          <pre>Script state: {JSON.stringify(scriptStates[scriptId], null, 2)}</pre>
          <pre>Script controller state: {JSON.stringify(scriptControllerStates[scriptId], null, 2)}</pre>
          <pre>Logs: {JSON.stringify(logByScript[scriptId], null, 2)}</pre>
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
        {view === 'queue' && (
          <>
          <div>
            <h2>Queue Debug Info</h2>
            <pre>{JSON.stringify(queue, null, 2)}</pre>
          </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Debugger;