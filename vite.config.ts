import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const plugins = [vue(), tailwindcss()]

  if (command === 'serve') {
    plugins.splice(1, 0, vueDevTools())
  }

  return {
    base: '/leafer-flow',
    plugins,
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return
            if (id.includes('vue')) return 'vendor-vue'
            if (id.includes('dagre') || id.includes('graphlib')) return 'vendor-graph'
            if (id.includes('marked')) return 'vendor-markdown'
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
  }
})
