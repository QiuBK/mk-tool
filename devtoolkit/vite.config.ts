import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

export default defineConfig({
  base: '',
  plugins: [react(), crx({ manifest })],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        sidepanel: 'src/sidepanel/index.html',
        popup: 'src/popup/index.html',
      },
      output: {
        manualChunks(id) {
          if (id.includes('exceljs')) return 'exceljs'
          if (id.includes('node_modules/react') || id.includes('node_modules/zustand')) return 'vendor'
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
