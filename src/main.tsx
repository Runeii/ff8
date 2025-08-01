import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

window.dump = {
  log: [],
  byScriptLabel: {},
  activeRemoteExecutions: {},
}
window.scriptDump = (scriptDump: ScriptDump) => {
  window.dump.log.push(scriptDump);
  const isRemoteExecution = scriptDump.methodId === 'remoteExecute';
  if (isRemoteExecution) {
    const isCompletingAnActiveRemoteExecution = !!window.dump.activeRemoteExecutions[scriptDump.payload];
    if (scriptDump.methodId === 'remoteExecute' && isCompletingAnActiveRemoteExecution) {
      delete window.dump.activeRemoteExecutions[scriptDump.payload];
    } else if (scriptDump.methodId === 'remoteExecute' && !isCompletingAnActiveRemoteExecution) {
      window.dump.activeRemoteExecutions[scriptDump.payload] = scriptDump
    }
  } else {
    if (!window.dump.byScriptLabel[scriptDump.scriptLabel]) {
      window.dump.byScriptLabel[scriptDump.scriptLabel] = {
        methods: [],
        state: {},
      };
    }
    window.dump.byScriptLabel[scriptDump.scriptLabel].methods.push(scriptDump);
    if (window.getScriptState[scriptDump.scriptLabel]) {
      window.dump.byScriptLabel[scriptDump.scriptLabel].state = window.getScriptState[scriptDump.scriptLabel]();
    }
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
