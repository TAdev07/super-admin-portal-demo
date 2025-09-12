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
  // Use shorthand to avoid TS type mismatch; host provides React singletons
  shared: ['react', 'react-dom']
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
