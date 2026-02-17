import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import compression from 'vite-plugin-compression';


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    compression({
      verbose: true,
      disable: false,
      threshold: 10240, // Compress files larger than 10KB
      algorithm: 'gzip',
      ext: '.gz',
    })],
  server: {
    host: '0.0.0.0'
  }
})
