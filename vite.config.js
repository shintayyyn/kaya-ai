import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Exclude large AI runtime files from SW precache — they are cached
        // by WebLLM / Transformers.js in browser Cache Storage automatically.
        globIgnores: [
          '**/*.wasm',
          '**/transformers.web-*.js',
          '**/lib-*.js',
          '**/ort-*.js',
        ],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB for remaining assets
      },
      manifest: {
        name: 'Kaya AI – Local Assistant',
        short_name: 'Kaya AI',
        description: 'Your everyday AI for cooking, repairs, commuting & more — runs 100% on-device',
        theme_color: '#06090f',
        background_color: '#06090f',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['@mlc-ai/web-llm', '@huggingface/transformers'],
  },
})
