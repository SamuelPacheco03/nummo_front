/*
  Lo que hace el service worker con un aviso que llega por Web Push.

  Va en `public/` y entra por `workbox.importScripts` (`vite.config.ts`) en vez de
  pasar la app a `injectManifest`: cambiar de estrategia significaría hacernos
  cargo del precache entero —el shell, el fallback de navegación, la regla
  `NetworkOnly` del API— para añadir dos escuchas. Este archivo se precachea con
  su revisión, así que al cambiarlo cambia también `sw.js` y el navegador se
  entera (§40.1).

  Sin `import` ni sintaxis moderna de módulo: se ejecuta dentro del worker
  generado por Workbox, que es un script clásico.
*/

/* global self, clients */

/** El icono del sistema. La clave semántica del aviso no es una imagen (§11.1.8). */
const APP_ICON = '/icons/icon-192.png'
const APP_BADGE = '/favicon-96.png'

/** Un aviso importante vibra; el resto solo aparece. */
const VIBRATE = [180, 90, 180]

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    // Un aviso ilegible no puede tumbar el worker. Nos enteramos al abrir la app.
    return
  }

  const priority = payload.priority
  const urgent = priority === 'HIGH' || priority === 'CRITICAL'

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Nummo', {
      body: payload.body || '',
      icon: APP_ICON,
      badge: APP_BADGE,
      // Tres avisos del mismo cobro se reemplazan en pantalla en vez de apilarse.
      // Sin `renotify`: reemplazar no debe volver a sonar.
      tag: payload.tag || undefined,
      vibrate: urgent ? VIBRATE : undefined,
      // Lo crítico se queda hasta que alguien lo mire; lo demás se va solo.
      requireInteraction: priority === 'CRITICAL',
      data: {
        deepLink: payload.deepLink || null,
        notificationId: payload.notificationId || null,
      },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const link = event.notification.data && event.notification.data.deepLink
  // Solo rutas internas: `//otro.sitio` es una URL absoluta disfrazada de ruta.
  const path = typeof link === 'string' && link.startsWith('/') && !link.startsWith('//') ? link : '/'
  const target = new URL(path, self.location.origin)

  event.waitUntil(
    (async () => {
      const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true })
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin)

      if (!open) {
        await clients.openWindow(target.href)
        return
      }

      await open.focus()
      /*
        `navigate` recarga la aplicación, y es a propósito. La alternativa
        —mandarle un mensaje para que navegue con su router— depende de que la
        pestaña abierta tenga una versión de la app que sepa escucharlo, y una
        que no lo sepa se queda enfocada sin ir a ninguna parte. Al llegar desde
        un aviso casi siempre se entra en frío; el caso raro paga una recarga a
        cambio de que el destino no falle nunca.
      */
      if (new URL(open.url).pathname + new URL(open.url).search !== target.pathname + target.search) {
        await open.navigate(target.href)
      }
    })(),
  )
})
