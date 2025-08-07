import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import { customManifestPlugin } from './vite-custom-manifest-plugin.js';
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {
    manifest: true,
  },
  plugins: [
    react(),
    ViteImageOptimizer({
      png: {
        quality: 100,
      }
    }),
    VitePWA({
      strategies: "injectManifest",
      injectRegister: false,
      manifest: false,
      injectManifest: {
        injectionPoint: undefined,
      },
      srcDir: 'src/serviceWorker',
      filename: '_sw.ts',
    }),
    customManifestPlugin()
  ],
})
