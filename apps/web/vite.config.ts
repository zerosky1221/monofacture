import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    // Block the UI kit's built-in CSS import (it contains a global * { padding:0; margin:0 }
    // reset that, when unlayered, overrides all Tailwind utilities). We import a sanitized
    // copy via index.css @import instead.
    {
      name: 'redirect-ui-kit-css',
      enforce: 'pre',
      resolveId(source, importer) {
        if (
          source === './index.css' &&
          importer &&
          importer.includes('@telegram-tools')
        ) {
          return path.resolve(__dirname, 'src/styles/ui-kit-noop.css');
        }
        return null;
      },
    },
    react(),
    nodePolyfills({
      include: ['buffer'],
      globals: {
        Buffer: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
    allowedHosts: ['.trycloudflare.com', 'localhost'],
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
