import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  base: '/leafer-flow',
  plugins: [
    vue(),
    vueDevTools(),

    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('vue')) return 'vendor-vue'
          if (id.includes('leafer-x-')) return 'vendor-leafer-plugins'
          if (id.includes('leafer') || id.includes('@leafer')) return 'vendor-leafer'
          return 'vendor'
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
