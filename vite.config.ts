import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Dos aplicaciones en un mismo proyecto.
 *
 * La experiencia pública y el panel se construyen por separado y no comparten
 * bundle: el visitante nunca descarga formularios, tablas ni el SDK de
 * autenticación, y el panel nunca descarga three.js. Comparten los tipos y el
 * modelo de datos, que es justamente lo que tiene que estar sincronizado.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },
});
