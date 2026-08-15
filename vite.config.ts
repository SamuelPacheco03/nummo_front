import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // Carga las VITE_* de .env / .env.[mode] para este contexto de Node (el proxy).
  // loadEnv NO expone nada al cliente; import.meta.env se resuelve aparte.
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  // En dev, el proxy mantiene front (5173) y api en el MISMO ORIGEN para que las
  // cookies HttpOnly de sesión + CSRF fluyan sin CORS. Destino configurable por env.
  const API_TARGET = env.VITE_API_PROXY_TARGET || 'http://localhost:4010'
  const proxyEntry = { target: API_TARGET, changeOrigin: true, secure: false }

  return {
    plugins: [react(), tailwindcss()],
    // El chunk principal (~166KB gzip) es el core de la app (router+query+radix+shell);
    // las páginas van en chunks lazy aparte. Subimos el umbral del aviso informativo.
    build: { chunkSizeWarningLimit: 700 },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': proxyEntry,
        '/health': proxyEntry,
        '/openapi.json': proxyEntry,
        '/docs': proxyEntry,
      },
    },
    test: {
      // Solo tests unitarios en src/. Los E2E (e2e/**) corren con Playwright, no Vitest.
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  }
})
