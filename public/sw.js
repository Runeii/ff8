const CACHE_NAME = 'threejs-app-v1';
const SETTINGS_STORE = 'offline-settings';
const SETTINGS_KEY = 'enabled';
const MANIFEST_URL = '/custom-manifest.json';

// Load file list from custom manifest
const getFilesToCache = async () => {
  try {
    const response = await fetch(MANIFEST_URL);
    if (!response.ok) {
      throw new Error(`Failed to load manifest: ${response.status}`);
    }
    
    const manifest = await response.json();
    
    if (!Array.isArray(manifest)) {
      throw new Error('Manifest must be a JSON array');
    }
    
    console.log(`Loaded ${manifest.length} files from manifest`);
    return manifest;
    
  } catch (error) {
    console.error('Failed to load custom manifest:', error);
    
    // Fallback to basic files if manifest fails
    return [
      '/',
      '/index.html',
      '/message_background.png',
      '/cursor.png'
    ];
  }
};

// Cache all files from manifest one at a time
const cacheAllFiles = async (onProgress = null) => {
  const cache = await caches.open(CACHE_NAME);
  
  // Load files from manifest
  const allFiles = await getFilesToCache();
  
  console.log(`Caching ${allFiles.length} files from manifest`);
  
  let cached = 0;
  let failed = 0;
  
  // Process each file one at a time
  for (let i = 0; i < allFiles.length; i++) {
    const file = allFiles[i];
    
    try {
      await cache.add(file);
      cached++;
      
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: allFiles.length,
          file,
          success: true
        });
      }
      
    } catch (error) {
      console.warn(`Failed to cache ${file}:`, error);
      failed++;
      
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: allFiles.length,
          file,
          success: false,
          error: error.message
        });
      }
    }
  }
  
  return { total: allFiles.length, cached, failed };
};

const broadcastToClients = async (message) => {
  const clients = await self.clients.matchAll();
  clients.forEach(client => client.postMessage(message));
};

// Storage functions
const setOfflineEnabled = async (enabled) => {
  const db = await openDatabase();
  const transaction = db.transaction([SETTINGS_STORE], 'readwrite');
  const store = transaction.objectStore(SETTINGS_STORE);
  await promisify(store.put(enabled, SETTINGS_KEY));
};

const getOfflineEnabled = async () => {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([SETTINGS_STORE], 'readonly');
    const store = transaction.objectStore(SETTINGS_STORE);
    const result = await promisify(store.get(SETTINGS_KEY));
    return result || false;
  } catch {
    return false;
  }
};

const openDatabase = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('OfflineSettings', 1);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE);
      }
    };
    request.onsuccess = (event) => resolve(event.target.result);
  });
};

const promisify = (request) => {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Main functions
const enableOfflineMode = async () => {
  try {
    await setOfflineEnabled(true);
    
    const result = await cacheAllFiles((progress) => {
      broadcastToClients({
        type: 'CACHE_PROGRESS',
        current: progress.current,
        total: progress.total,
        percentage: Math.round((progress.current / progress.total) * 100),
        file: progress.file,
        success: progress.success,
        error: progress.error
      });
    });
    
    await broadcastToClients({
      type: 'OFFLINE_ENABLED',
      totalAssets: result.total,
      cachedAssets: result.cached
    });
    
  } catch (error) {
    console.error('Failed to enable offline mode:', error);
    await broadcastToClients({ 
      type: 'OFFLINE_ENABLE_FAILED', 
      error: error.message 
    });
  }
};

const disableOfflineMode = async () => {
  try {
    await setOfflineEnabled(false);
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    await broadcastToClients({ type: 'OFFLINE_DISABLED' });
  } catch (error) {
    console.error('Failed to disable offline mode:', error);
  }
};

const handleFetch = async (request) => {
  const offlineEnabled = await getOfflineEnabled();
  
  if (!offlineEnabled) {
    return fetch(request);
  }
  
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses for future use
    if (networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // If offline and requesting a document, try to serve the cached index
    if (request.destination === 'document') {
      const cachedIndex = await caches.match('/');
      if (cachedIndex) return cachedIndex;
    }
    throw error;
  }
};

// Event listeners
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('message', async (event) => {
  const { type } = event.data;
  
  switch (type) {
    case 'ENABLE_OFFLINE':
      await enableOfflineMode();
      break;
    case 'DISABLE_OFFLINE':
      await disableOfflineMode();
      break;
  }
});

self.addEventListener('fetch', (event) => {
  event.respondWith(handleFetch(event.request));
});