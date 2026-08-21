import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import { execSync } from 'node:child_process'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import type { Plugin } from 'vite'

/**
 * En desarrollo, `/app/...` tiene que servir `app.html`.
 *
 * Con dos entradas, Vite sirve `index.html` en `/` y `app.html` en `/app.html`, pero no
 * sabe que el router de la consola usa `basename: '/app'`: entrar a `/app/cartera` daba un
 * 404. Esto es el equivalente en dev de lo que el hosting tiene que hacer en producción
 * (§97.11), y por eso el comentario está aquí y no solo en el despliegue.
 *
 * Solo reescribe **navegaciones**: una petición a `/app/algo.js` es un asset y tiene que
 * seguir su camino, o el navegador recibiría HTML donde espera JavaScript.
 */
function servirAppEnDev(): Plugin {
  /*
    Solo reescribe **navegaciones**: una petición a `/app/algo.js` es un asset y tiene que
    seguir su camino, o el navegador recibiría HTML donde espera JavaScript.
  */
  const reenviar = (req: { url?: string; headers: { accept?: string } }) => {
    const url = req.url ?? ''
    if (!req.headers.accept?.includes('text/html')) return
    if (url === '/app' || url.startsWith('/app/')) req.url = '/app.html'
  }

  return {
    name: 'nummo-app-html-en-dev',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        reenviar(req)
        next()
      })
    },
    /*
      `preview` también, y no es un detalle: es la ÚNICA forma de probar el service worker
      de verdad, y sin esto entrar a `/app/` en preview daba un 404 — o sea que el worker
      no se registraba y la prueba no probaba nada.
    */
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        reenviar(req)
        next()
      })
    },
  }
}

/**
 * Identidad del build, para «Aplicación» en Configuración y para soporte.
 *
 * Es el commit y no una fecha a propósito: la fecha cambia en cada `vite build`
 * aunque no haya cambiado una línea, y eso mete el timestamp en el bundle, mueve
 * el hash y hace que el service worker anuncie «versión nueva» por un rebuild
 * del mismo código. El SHA solo cambia cuando cambia el código.
 */
function buildId(): string {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return 'dev'
  }
}

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
    /*
      Dos entradas, un repo (§97.11): `index.html` es la portada y `app.html` la consola.
      `appType: 'mpa'` apaga el fallback de página única de Vite, que devolvía `index.html`
      —la portada— para cualquier ruta desconocida, incluidas las de la app.
    */
    appType: 'mpa',
    plugins: [
      servirAppEnDev(),
      react(),
      tailwindcss(),
      VitePWA({
        /*
          **El service worker es de la app, no del sitio.** Con `scope: '/'` —lo de antes—
          la portada caía dentro de él, y una portada precacheada sirve el precio viejo
          después de cambiarlo: exactamente lo que no puede pasar en la página que publica
          la tarifa.

          Un worker servido desde `/sw.js` puede ESTRECHARSE a `/app/` sin ninguna cabecera
          especial; lo que necesitaría `Service-Worker-Allowed` es lo contrario, ampliar.
        */
        scope: '/app/',
        // 'prompt': el usuario decide cuándo recargar. En una consola financiera
        // no queremos recargar bajo los pies de alguien a medio formulario.
        registerType: 'prompt',
        injectRegister: null, // el registro lo hace src/pwa/register.ts
        includeAssets: ['favicon.ico', 'favicon-32.png', 'favicon-96.png', 'apple-touch-icon.png'],
        manifest: {
          id: '/app/',
          name: 'Nummo · Administración financiera',
          short_name: 'Nummo',
          description:
            'Administración financiera y de cartera, multiempresa y multisede. Contactos, cobros, gastos y cuentas con control por roles.',
          lang: 'es',
          dir: 'ltr',
          start_url: '/app/',
          scope: '/app/',
          display: 'standalone',
          display_override: ['standalone', 'minimal-ui'],
          orientation: 'any',
          background_color: '#f8fafc',
          theme_color: '#2563eb',
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
              url: '/app/cartera/cxc',
              icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
            },
            {
              name: 'Cuentas por pagar',
              url: '/app/gastos/cxp',
              icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
            },
            {
              name: 'Resultados',
              url: '/app/informes/resultados',
              icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
            },
          ],
        },
        workbox: {
          /*
            Las dos escuchas de Web Push (`push` y `notificationclick`) viven en
            `public/push-sw.js` y entran aquí. Es lo que evita pasar la app a
            `injectManifest`, que obligaría a hacernos cargo del precache entero
            para añadir dos escuchas. El archivo entra en el manifiesto con su
            revisión, así que al cambiarlo cambia `sw.js` y el navegador lo nota.
          */
          importScripts: ['/push-sw.js'],
          // Shell de la app precacheado (app-shell + assets con hash).
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,woff2}'],
          /*
            La portada queda **fuera del precache**. Sus trozos salen con el nombre de su
            entrada (`portada-*`), y su HTML es `index.html`. Los trozos que comparte con la
            app —iconos, utilidades— siguen dentro, y está bien: los descarga la app de
            todas formas.
          */
          globIgnores: ['index.html', 'assets/portada-*'],
          // El chunk principal supera los 2 MiB por defecto solo en algunos builds;
          // 4 MiB deja margen sin volverse un cajón de sastre.
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          // Dentro de `/app/`, cualquier ruta la resuelve el shell de la consola.
          navigateFallback: '/app.html',
          navigateFallbackDenylist: API_PATHS,
          // Datos financieros y sesión: siempre red, nunca caché.
          runtimeCaching: [
            {
              /*
                Los patrones van **escritos aquí dentro**, repetidos, y no leyendo
                `API_PATHS`. Workbox serializa esta función al texto del service
                worker, así que cualquier variable de fuera del cuerpo llega al
                worker como un identificador que no existe: la regla reventaba con
                un `ReferenceError` en vez de aplicarse. El único sitio donde se
                nota es aquí; `navigateFallbackDenylist` recibe los regex como
                dato y sí funciona.
              */
              urlPattern: ({ url }) =>
                /^\/api\//.test(url.pathname) ||
                url.pathname === '/health' ||
                url.pathname === '/openapi.json' ||
                url.pathname.startsWith('/docs'),
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
          navigateFallback: '/app.html',
        },
      }),
    ],
    define: { __BUILD_ID__: JSON.stringify(buildId()) },
    // El chunk principal (~166KB gzip) es el core de la app (router+query+radix+shell);
    // las páginas van en chunks lazy aparte. Subimos el umbral del aviso informativo.
    build: {
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        input: {
          portada: fileURLToPath(new URL('./index.html', import.meta.url)),
          app: fileURLToPath(new URL('./app.html', import.meta.url)),
        },
      },
    },
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
