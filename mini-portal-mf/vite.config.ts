import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'mini_portal_mf',
      filename: 'remoteEntry.js',
      exposes: {
        './Widget': './src/Widget.tsx',
        './App': './src/App.tsx'
      },
      shared: {
        react: { singleton: true, eager: false, requiredVersion: '^18.0.0' },
        'react-dom': { singleton: true, eager: false, requiredVersion: '^18.0.0' }
      }
    })
  ],
  server: {
    port: 5174,
    strictPort: true
  },
  build: {
    target: 'esnext',
    modulePreload: false,
    cssCodeSplit: true,
    sourcemap: true
  }
});
