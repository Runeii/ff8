import { SERVICE_WORKER_STATE } from "../OfflineController";
import { getPreservedState, setPreservedState } from "./db";
import { enableOfflineMode } from "./main";

const sw = self as unknown as ServiceWorkerGlobalScope

const STATE = structuredClone(SERVICE_WORKER_STATE);

export const getState = () => STATE;

export const announceStateUpdate = async () => {
  const clients = await sw.clients.matchAll();
  clients.forEach(client => client.postMessage(STATE));
};

export const updateState = async (newState: Partial<typeof STATE>) => {
  Object.assign(STATE, newState);
  await setPreservedState(STATE);
  await announceStateUpdate();
}

export const recoverState = async () => {
  console.log('Recovering Service Worker State:', STATE);
  const preservedState = await getPreservedState();
  await updateState(preservedState);

  const recoveredState = getState();
  setTimeout(() => {
    if (recoveredState.isEnablingOffline && !recoveredState.isOfflineEnabled) {
      enableOfflineMode();
    }
  }, 1000);
}