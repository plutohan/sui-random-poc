import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// WASM disabled - not needed for basic functionality
// import wasm from 'vite-plugin-wasm'
// import topLevelAwait from 'vite-plugin-top-level-await'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // WASM disabled
    // wasm(),
    // topLevelAwait(),
  ],
  optimizeDeps: {
    // WALRUS - COMMENTED OUT (Walrus disabled)
    // exclude: ['@mysten/walrus'],
    include: ['dataloader', 'use-sync-external-store'],
    esbuildOptions: {
      target: 'esnext',
    },
    force: true,
  },
  build: {
    target: 'esnext',
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    proxy: {
      '/api/sui': {
        target: 'https://fullnode.testnet.sui.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/sui/, ''),
        secure: true,
      },
    },
  },
})
