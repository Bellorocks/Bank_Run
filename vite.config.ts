import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string };

/**
 * Cloudflare Web Analytics: lo script va solo nel sito pubblicato (con il token in
 * .env.production), mai in sviluppo, dove conterebbe le visite di localhost.
 */
function cloudflareWebAnalytics(token: string | undefined): Plugin {
  return {
    name: 'cloudflare-web-analytics',
    apply: 'build',
    transformIndexHtml(html) {
      if (!token) return html;
      const beacon = `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${token}"}'></script>`;
      return html.replace('</body>', `    ${beacon}
  </body>`);
    },
  };
}

// Tauri espone TAURI_* in dev; il server deve essere fisso e senza HMR overlay invadente.
export default defineConfig(({ mode }) => ({
  plugins: [react(), cloudflareWebAnalytics(loadEnv(mode, process.cwd(), 'VITE_').VITE_CF_BEACON_TOKEN)],
  // La versione accompagna ogni evento delle statistiche: serve a confrontare le release.
  define: { 'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version) },
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
    // Nessuna mappa del codice nel sito pubblicato: meno peso e codice non in chiaro.
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
  },
}));
