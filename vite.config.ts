import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Tauri espone TAURI_* in dev; il server deve essere fisso e senza HMR overlay invadente.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  clearScreen: false,
  server: {
    port: 5183,
    strictPort: true,
    watch: {
      // src-tauri e' gestito da cargo, non ricaricare il frontend sui suoi cambi
      ignored: ['**/src-tauri/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: 'esnext',
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
  },
});
