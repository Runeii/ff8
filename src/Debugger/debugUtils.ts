export const sendToDebugger = (type: string, payload?: string, blob?: Blob) => {
  const channel = new BroadcastChannel('debugger');
  channel.postMessage({ type, payload, blob });
}
