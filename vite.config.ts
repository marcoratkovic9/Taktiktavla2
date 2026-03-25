import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['defaults', 'iOS >= 12'],
      renderLegacyChunks: true,
      modernPolyfills: true,
    }),
  ],
  server: {
    host: true,
  },
});
