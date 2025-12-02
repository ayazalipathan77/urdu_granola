import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
  publicDir: 'public',
  define: {
    'process.env.GROQ_API_KEY': JSON.stringify(process.env.GROQ_API_KEY || ''),
    'process.env.OUTLOOK_CLIENT_ID': JSON.stringify(process.env.OUTLOOK_CLIENT_ID || ''),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    port: 3000,
  }
});