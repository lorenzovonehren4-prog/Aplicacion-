import { defineConfig } from 'vitest/config';

// Configuración de Vite (desarrollo y build) y de Vitest (pruebas unitarias).
export default defineConfig({
  // Rutas relativas: el build funciona servido desde cualquier subcarpeta.
  base: './',
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
  build: {
    target: 'es2022',
    // Three.js ocupa ~700 kB minificado y los trazados de las 24 pistas otro
    // tanto: un paquete de ~1.8 MB es esperable y no amerita aviso.
    chunkSizeWarningLimit: 2400,
    assetsInlineLimit: 0,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
