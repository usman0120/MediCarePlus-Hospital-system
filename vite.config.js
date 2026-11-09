import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 3000, host: '127.0.0.1' },
  resolve: { dedupe: ['react', 'react-dom'] },
  build: { sourcemap: false, rollupOptions: { output: { manualChunks(id) {
    if (id.includes('/node_modules/firebase/') || id.includes('/node_modules/@firebase/')) return 'firebase';
    if (['react', 'react-dom', 'react-router', 'react-router-dom'].some(name => id.includes(`/node_modules/${name}/`))) return 'react';
  } } } },
});
