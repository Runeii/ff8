import { CACHE_NAME } from "./CONSTANTS";
import { getState, updateState } from "./state";

const VITE_MANIFEST_URL = '/.vite/manifest.json';
const CUSTOM_MANIFEST_URL = '/custom-manifest.json';

export const loadCustomManifest = async () => {
  const response = await fetch(CUSTOM_MANIFEST_URL);
  if (!response.ok) {
    throw new Error(`Failed to load manifest: ${response.status}`);
  }
  
  const manifest = await response.json();
  
  if (!Array.isArray(manifest)) {
    throw new Error('Manifest must be a JSON array');
  }
  
  console.log(`Loaded ${manifest.length} files from custom manifest`);
  return manifest;
};

const loadViteManifest = async () => {
  const response = await fetch(VITE_MANIFEST_URL);
  if (!response.ok) { 
    throw new Error(`Failed to load Vite manifest: ${response.status}`);
  }
  const manifest = await response.json();
  console.log(`Loaded ${manifest.length} files from Vite manifest`);
  return manifest;
};

export const loadManifest = async () => {
  const customManifest = await loadCustomManifest();
  const viteManifest = await loadViteManifest();

  let baseManifest = customManifest.map(file => [file, file]);
  if (viteManifest) {
    baseManifest = baseManifest.concat(
      // @ts-expect-error viteManifest is not typed
      Object.entries(viteManifest).map(([file, { file: viteFile }]) => [file, viteFile])
    );
  }

  return baseManifest;
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const cacheFile = async (key: string, file: string) => {
  const cache = await caches.open(CACHE_NAME);
  const response = await fetch(file);
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${file}`);
  }
  console.log(`Caching file: ${key} -> ${file}`);
  await cache.put(key, response);

  const { progress } = getState();

  await updateState({
    progress: {
      ...progress,
      current: progress.current + 1,
    }
  });
};

let isInProgress = false;
export const enableOfflineMode = async () => {
  if (isInProgress) return;

  isInProgress = true;
  await updateState({
    isEnablingOffline: true,
    isOfflineEnabled: false,
  });

  // DO THE WORK HERE
  const manifest = await loadManifest();
  console.log('Enabling offline mode with manifest:', manifest);

  const currentState = getState();

  // Build has changed, reset offline mode
  if (currentState.progress.total && currentState.progress.total !== manifest.length) {
    await disableOfflineMode();
  }

  const latestState = getState();
  await updateState({
    isEnablingOffline: true,
    isOfflineEnabled: false,
    progress: {
      ...latestState.progress,
      total: manifest.length,
    }
  });

  let remainingManifest = [...manifest];
  if (latestState.progress.current > 0) {
    remainingManifest = manifest.slice(latestState.progress.current);
    console.log(`Resuming from ${latestState.progress.current} files already cached`);
  }

  let index = 0;
  for await (const [key, file] of remainingManifest) {
    await cacheFile(key, file);
    index++;

    if (index % 500 === 0) {
      console.log(`Cached ${index} files`);
      await delay(500)
    }
  }

  await updateState({
    isEnablingOffline: false,
    isOfflineEnabled: true,
  });
}

export const disableOfflineMode = async () => {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));

  await updateState({
    isEnablingOffline: false,
    isOfflineEnabled: false,
    progress: {
      current: 0,
      total: 0,
    }
  });
}