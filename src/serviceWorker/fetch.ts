import { CACHE_NAME } from "./CONSTANTS";
import { getState } from "./state";

export const handleFetch = async (request: Request) => {
  const url = new URL(request.url);
  
  // Skip non-HTTP(S) requests
  if (!['http:', 'https:'].includes(url.protocol)) {
    return fetch(request);
  }

  const {isOfflineEnabled} = await getState();
  console.log(`Handling fetch for: ${url.pathname}, Offline mode: ${isOfflineEnabled}`);
  // If offline mode is disabled, just fetch normally
  if (!isOfflineEnabled) {
    return fetch(request);
  }

  // Try cache first
  const cached = await caches.match(request);
  console.log(`Cache match for ${url.pathname}:`, !!cached);
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
