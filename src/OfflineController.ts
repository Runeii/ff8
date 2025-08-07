import { createStore } from "zustand";

export const SERVICE_WORKER_STATE = {
  isEnablingOffline: false,
  isOfflineEnabled: false,
  progress: {
    current: 0,
    total: 0,
  },
}

export type ServiceWorkerState = typeof SERVICE_WORKER_STATE;

const OfflineController = () => {
  const { getState, setState, subscribe } = createStore(() => structuredClone(SERVICE_WORKER_STATE));

  const recoverState = () => {
    const controller = navigator.serviceWorker?.controller;
    if (!controller) {
      console.warn('Service worker not ready, cannot enable offline mode');
      return;
    }

    controller.postMessage({ type: 'RECOVER_STATE' });
  }

  const enableOfflineMode = async () => {
    const controller = navigator.serviceWorker?.controller;
    if (!controller) {
      console.warn('Service worker not ready, cannot enable offline mode');
      return;
    }

    controller.postMessage({ type: 'ENABLE_OFFLINE' });
  };

  const disableOfflineMode = async () => {
    const controller = navigator.serviceWorker?.controller;
    if (!controller) {
      console.warn('Service worker not ready, cannot disable offline mode');
      return;
    }

    controller.postMessage({ type: 'DISABLE_OFFLINE' });
  };

  const initialize = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/_sw.js');
      console.log('Service worker registered:', registration.scope);

      navigator.serviceWorker.addEventListener('message', (event: MessageEvent<typeof SERVICE_WORKER_STATE>) => {
        setState(event.data);
      });

      const readiness = await navigator.serviceWorker.ready;
      console.log('Service worker is ready:', readiness.active?.state);
      await recoverState();
    } catch (error) {
      console.error('OfflineController initialization failed:', error);
    }
  };

  // Start initialization
  if ('serviceWorker' in navigator) {
    initialize();
  }

  return {
    getState,
    subscribe,
    enableOfflineMode,
    disableOfflineMode,
  };
};

export const offlineController = OfflineController();
export default OfflineController;