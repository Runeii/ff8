import { createStore } from "zustand";

const OfflineController = () => {
  const { getState, setState, subscribe } = createStore(()  => ({
    isOfflineEnabled: false,
    isOfflineSupported: false,
    cachedAssets: 0,
    cacheProgress: {
      current: 0,
      total: 0
    }
  }));

  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js');
        console.log('Service worker registered');
      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    }
  }
  
  const setupMessageHandler = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, current, total, cachedAssets, error } = event.data;
        
        switch (type) {
          case 'CACHE_PROGRESS':
            if (current === total) {
              console.log('Caching complete.');
            }
            setState({
              cachedAssets: current,
              cacheProgress: {
                current,
                total,
              }
            });
            break;
          case 'OFFLINE_ENABLED':
            setState({
              isOfflineEnabled: true,
              isOfflineSupported: true,
              cachedAssets
            });
            console.log(`Offline mode enabled. ${cachedAssets} assets cached.`);
            break;
          case 'OFFLINE_DISABLED':
            setState({
              isOfflineEnabled: false,
              isOfflineSupported: false,
              cachedAssets: 0
            });
            console.log('Offline mode disabled.');
            break;
          case 'OFFLINE_ENABLE_FAILED':
            console.error('Failed to enable offline mode:', error);
            break;
        }
      });
    }
  }

  const enableOfflineMode = async () => {
    console.log('Enabling offline mode...', navigator, navigator.serviceWorker, navigator.serviceWorker.controller);
    if (!navigator.serviceWorker.controller) {
      throw new Error('Service worker not ready');
    }

    setState({
      isOfflineEnabled: true
    });
    
    navigator.serviceWorker.controller.postMessage({
      type: 'ENABLE_OFFLINE'
    });
  }

  const disableOfflineMode = async () => {
    if (!navigator.serviceWorker.controller) {
      throw new Error('Service worker not ready');
    }
    
    setState({
      isOfflineEnabled: false,
      isOfflineSupported: false,
    });

    navigator.serviceWorker.controller.postMessage({
      type: 'DISABLE_OFFLINE'
    });
  }
  
  const initialize = async () => {
    await registerServiceWorker();
    await setupMessageHandler();
  }

  initialize();

  return {
    getState,
    subscribe,
    enableOfflineMode,
    disableOfflineMode
  }
}

export const offlineController = OfflineController();

export default OfflineController