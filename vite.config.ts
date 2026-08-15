import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  // Carga las VITE_* de .env / .env.[mode] para este contexto de Node (el proxy).
  // loadEnv NO expone nada al cliente; import.meta.env se resuelve aparte.
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  // En dev, el proxy mantiene front (5173) y api en el MISMO ORIGEN para que las
  // cookies HttpOnly de sesión + CSRF fluyan sin CORS. Destino configurable por env.
  const API_TARGET = env.VITE_API_PROXY_TARGET || 'http://localhost:4010'
  const proxyEntry = { target: API_TARGET, changeOrigin: true, secure: false }

  // Rutas servidas por la API: el service worker NUNCA debe responderlas desde
  // caché ni devolver el index.html como fallback de navegación.
  const API_PATHS = [/^\/api\//, /^\/health$/, /^\/openapi\.json$/, /^\/docs/]

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        // 'prompt': el usuario decide cuándo recargar. En una consola financiera
        // no queremos recargar bajo los pies de alguien a medio formulario.
        registerType: 'prompt',
        injectRegister: null, // el registro lo hace src/pwa/register.ts
        includeAssets: ['favicon-32.png', 'favicon-96.png', 'apple-touch-icon.png'],
        manifest: {
          id: '/',
          name: 'Nummo · Administración financiera',
          short_name: 'Nummo',
          description:
            'Administración financiera y de cartera, multiempresa y multisede. Contactos, cobros, gastos y cuentas con control por roles.',
          lang: 'es',
          dir: 'ltr',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          display_override: ['standalone', 'minimal-ui'],
          orientation: 'any',
          background_color: '#f8fafc',
          theme_color: '#1e293b',
          categories: ['business', 'finance', 'productivity'],
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            {
              src: '/icons/maskable-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/icons/maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
          shortcuts: [
            {
              name: 'Cuentas por cobrar',
              url: '/cartera/cxc',
              icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
            },
            {
              name: 'Cuentas por pagar',
              url: '/gastos/cxp',
              icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
            },
            {
              name: 'Resultados',
              url: '/informes/resultados',
              icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
            },
          ],
        },
        workbox: {
          // Shell de la app precacheado (app-shell + assets con hash).
          globPatterns: ['**/*.{js,css,html,png,svg,webmanifest,woff2}'],
          // El chunk principal supera los 2 MiB por defecto solo en algunos builds;
          // 4 MiB deja margen sin volverse un cajón de sastre.
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          navigateFallback: '/index.html',
          navigateFallbackDenylist: API_PATHS,
          // Datos financieros y sesión: siempre red, nunca caché.
          runtimeCaching: [
            {
              urlPattern: ({ url }) => API_PATHS.some((re) => re.test(url.pathname)),
              handler: 'NetworkOnly',
            },
          ],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
        },
        // El SW en dev ensucia el HMR; se activa a demanda con VITE_PWA_DEV=true.
        devOptions: {
          enabled: env.VITE_PWA_DEV === 'true',
          type: 'module',
          navigateFallback: '/index.html',
        },
      }),
    ],
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
