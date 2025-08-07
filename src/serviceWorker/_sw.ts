/// <reference lib="webworker" />

import { handleFetch } from "./fetch";
import { disableOfflineMode, enableOfflineMode } from "./main";
import { recoverState } from "./state";

const sw = self as unknown as ServiceWorkerGlobalScope

const handleIncomingMessage = async ({ type }: {
  type: 'ENABLE_OFFLINE' | 'DISABLE_OFFLINE' | 'RECOVER_STATE';
}) => {
  console.log(`Service Worker: Received message of type ${type}`);

  switch (type) {
    case 'RECOVER_STATE':
      await recoverState();
      break;
    case 'ENABLE_OFFLINE':
      await enableOfflineMode();
      break;
      
    case 'DISABLE_OFFLINE':
      await disableOfflineMode();
      break;
      
    default:
      console.warn(`Service Worker: Unknown message type: ${type}`);
  }
}

sw.addEventListener('message', e => handleIncomingMessage(e.data));

sw.addEventListener('install', () => {
  console.log('Service Worker: Installing');
  sw.skipWaiting();
});

sw.addEventListener('fetch', (event) => {
  event.respondWith(handleFetch(event.request));
});