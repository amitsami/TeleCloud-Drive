import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
export default defineConfig({
  base: './',
  plugins: [nodePolyfills({ globals: { Buffer: true, process: true, global: true }, protocolImports: true })],
  build: { target: 'es2020', chunkSizeWarningLimit: 4000 },
})
