import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Los tests de reglas hablan con el emulador: son de integración y
    // no deben correr en paralelo pisándose los datos.
    fileParallelism: false,
    testTimeout: 20000,
  },
});
