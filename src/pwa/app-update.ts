import { useSyncExternalStore } from 'react'
import { registerSW } from 'virtual:pwa-register'

/** Cada cuánto se pregunta por una versión nueva mientras la pestaña sigue viva. */
const POLL_MS = 30 * 60 * 1000
/** Mínimo entre dos comprobaciones, para que volver a la pestaña no dispare una ráfaga. */
const THROTTLE_MS = 60 * 1000
/**
 * Si al aceptar la actualización el navegador no cambia de controlador,
 * recargamos igual: más vale una recarga de más que un botón que no hace nada.
 */
const RELOAD_FALLBACK_MS = 4000

export type UpdateState =
  /** No hay nada que hacer. */
  | 'idle'
  /** Preguntando al servidor. */
  | 'checking'
  /** Hay versión nueva esperando. */
  | 'ready'
  /** Aplicándola; la página está a punto de recargarse. */
  | 'updating'

export interface AppUpdate {
  state: UpdateState
  /** Momento de la última comprobación terminada, o `null` si aún no hubo ninguna. */
  lastCheck: number | null
  /** El navegador no soporta service workers, o el registro falló. */
  supported: boolean
  /** El shell acaba de quedar precacheado: la app ya abre sin conexión. */
  offlineReady: boolean
}

/*
  Un store de módulo y no un contexto: la actualización es **una** por
  aplicación —un registro, un temporizador, un aviso— y con `useRegisterSW` en
  dos componentes habría dos de cada. Es la misma forma que `OfflineIndicator`
  (§45): estado del navegador, leído con `useSyncExternalStore`.
*/
let snapshot: AppUpdate = { state: 'idle', lastCheck: null, supported: true, offlineReady: false }
const listeners = new Set<() => void>()

function set(next: Partial<AppUpdate>): void {
  snapshot = { ...snapshot, ...next }
  for (const listener of listeners) listener()
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => {
    listeners.delete(onChange)
  }
}

let started = false
let swUrl: string | null = null
let registration: ServiceWorkerRegistration | null = null
let updateServiceWorker: ((reload?: boolean) => Promise<void>) | null = null
let checking = false
let lastCheckAt = 0

/**
 * **Preguntar si hay un despliegue nuevo, de verdad.**
 *
 * `registration.update()` vuelve a pedir el `sw.js`, pero el navegador puede
 * responderlo desde su propia caché HTTP y entonces la comprobación no comprueba
 * nada: el archivo del servidor ya cambió y aquí seguimos viendo el viejo. Por
 * eso primero se pide con `cache: 'no-store'`, que refresca esa entrada, y solo
 * después se llama a `update()`.
 *
 * Esa línea es la diferencia entre detectar el despliegue y creer que no lo hay.
 *
 * @param force salta el mínimo entre comprobaciones (para el botón manual).
 */
export async function checkForUpdate(force = false): Promise<void> {
  if (!registration || !swUrl || checking) return
  if (!navigator.onLine) return
  const now = Date.now()
  if (!force && now - lastCheckAt < THROTTLE_MS) return

  checking = true
  lastCheckAt = now
  if (snapshot.state === 'idle') set({ state: 'checking' })
  try {
    const response = await fetch(swUrl, {
      cache: 'no-store',
      headers: { 'cache-control': 'no-cache' },
    })
    if (response.status === 200) await registration.update()
  } catch {
    // Sin red o servidor caído. No es un error que contarle a nadie: se
    // reintenta en la siguiente ocasión, que llega sola.
  } finally {
    checking = false
    set({ state: snapshot.state === 'checking' ? 'idle' : snapshot.state, lastCheck: Date.now() })
  }
}

/**
 * Aplica la versión nueva. La recarga la dispara el evento `controlling` que
 * monta vite-plugin-pwa; si no llega —un worker que no responde al
 * `SKIP_WAITING`, justo el caso de «no consigo quitarme la caché»— recargamos a
 * mano pasados unos segundos.
 */
export function applyUpdate(): void {
  set({ state: 'updating' })
  void updateServiceWorker?.(true)
  window.setTimeout(() => window.location.reload(), RELOAD_FALLBACK_MS)
}

/**
 * Registra el service worker y programa las comprobaciones. Idempotente: la
 * llama el `PwaUpdater`, que se monta una sola vez.
 *
 * **Cuándo se pregunta**, que era el fallo de fondo:
 *
 * | Momento | Por qué |
 * | --- | --- |
 * | Al abrir | El despliegue pudo ocurrir con la app cerrada |
 * | Al volver a la pestaña | Es el «vuelvo al trabajo» de verdad |
 * | Al recuperar conexión | Sin red la comprobación no sale |
 * | Cada 30 min | Para la sesión que se queda abierta toda la tarde |
 *
 * Antes solo estaba el temporizador, y es el más débil de los cuatro: el
 * navegador congela los de una pestaña en segundo plano y en móvil suspende la
 * app entera. De ahí el «a veces sale el aviso y a veces no».
 */
export function startAppUpdates(): void {
  if (started) return
  started = true

  if (!('serviceWorker' in navigator)) {
    set({ supported: false })
    return
  }

  updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh() {
      set({ state: 'ready' })
    },
    onOfflineReady() {
      set({ offlineReady: true })
    },
    onRegisteredSW(url, reg) {
      swUrl = url
      registration = reg ?? null
      /*
        Cinturón: workbox ya avisa de un worker en espera al registrarse, pero si
        ese aviso se perdiera —o el registro viniera de otra pestaña— la app se
        quedaría sin actualizar para siempre. Preguntarlo directo no cuesta nada.
      */
      if (reg?.waiting) set({ state: 'ready' })
      void checkForUpdate(true)
    },
    onRegisterError() {
      set({ supported: false })
    },
  })

  const onVisible = () => {
    if (document.visibilityState === 'visible') void checkForUpdate()
  }
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('online', () => void checkForUpdate(true))
  window.setInterval(() => void checkForUpdate(), POLL_MS)
}

/** Estado de la actualización, para pintarlo. */
export function useAppUpdate(): AppUpdate {
  return useSyncExternalStore(subscribe, () => snapshot)
}

/**
 * **La salida de emergencia.** Borra todas las cachés del navegador para este
 * origen, da de baja los service workers y recarga desde el servidor.
 *
 * Existe porque cuando algo se atasca —un worker que no se rinde, un shell a
 * medio actualizar— la alternativa del usuario es «borrar los datos del sitio»
 * en un menú del navegador que casi nadie encuentra. No toca `localStorage`:
 * la sesión, el tema y las preferencias sobreviven.
 */
export async function clearAppCache(): Promise<void> {
  if ('caches' in window) {
    const keys = await caches.keys()
    await Promise.all(keys.map((key) => caches.delete(key)))
  }
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((reg) => reg.unregister()))
  }
  window.location.reload()
}
