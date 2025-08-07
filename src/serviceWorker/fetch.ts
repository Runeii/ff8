import { CACHE_NAME } from "./CONSTANTS";
import { getState } from "./state";

export const handleFetch = async (request: Request) => {
  const url = new URL(request.url);
  
  // Skip non-HTTP(S) requests
  if (!['http:', 'https:'].includes(url.protocol)) {
    return fetch(request);
  }

  const {isOfflineEnabled} = await getState();

  // If offline mode is disabled, just fetch normally
  if (!isOfflineEnabled) {
    return fetch(request);
  }

  // Try cache first
  const cached = await caches.match(request);

  if (cached) {
    console.log(`Serving from cache: ${url.pathname}`);
    return cached;
  }

  // Try network with cache fallback
  try {
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error(`Fetch failed for ${url.pathname}:`, error);
    
    // For document requests, try to serve the root page
    if (request.destination === 'document') {
      const fallback = await caches.match('/');
      if (fallback) {
        console.log('Serving fallback page');
        return fallback;
      }
    }
    
    throw new Error('Fetch failed and no cached version available');
  }
};


export const fetchFile = async (file: string, signal?: AbortSignal): Promise<Response> => {
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  const waitForOnline = (): Promise<void> => {
    return new Promise((resolve) => {
      if (navigator.onLine) {
        resolve();
        return;
      }
      
      const handleOnline = () => {
        window.removeEventListener('online', handleOnline);
        resolve();
      };
      
      window.addEventListener('online', handleOnline);
    });
  };

  const attemptFetch = async (): Promise<Response> => {
    // Check if we're offline and wait for connection
    if (!navigator.onLine) {
      console.log('Network offline, waiting for connection...');
      await waitForOnline();
    }

    try {
      const response = await fetch(file, { signal });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      // Check if it's an abort signal
      if (signal?.aborted) {
        throw error;
      }
      
      // Check if it's a network error
      if (error instanceof TypeError || (error instanceof TypeError && error.message.includes('NetworkError'))) {
        console.log('Network error detected, waiting for connection...');
        await waitForOnline();
      }
      
      throw error;
    }
  };

  // Main retry loop
  while (true) {
    try {
      return await attemptFetch();
    } catch (error) {
      // If aborted, don't retry
      if (signal?.aborted) {
        throw error;
      }
      
      console.log(`Fetch failed for ${file}, retrying in 2 seconds...`, error);
      await sleep(2000);
      
      // Check if we were aborted during the sleep
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
    }
  }
};
