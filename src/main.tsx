import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

window.dump = []
window.scriptDump = (scriptDump: ScriptDump) => {
  if (![0,1,8,9].includes(scriptDump.scriptLabel) && scriptDump.methodId !== 'remoteExecute') {
    return;
  }
  if (scriptDump.methodId === 'default') {
    return;
  }
  window.dump.push(scriptDump);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
