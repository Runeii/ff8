import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import Debugger from './Debugger/Debugger.tsx'
import { sendToDebugger } from './Debugger/debugUtils.ts'

const isDebugger = window.location.pathname.includes('debugger');

sendToDebugger('reset')
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isDebugger ? <Debugger /> : <App />}
  </React.StrictMode>,
)
