/**
 * Web Push: lo que hay que hablar con el navegador para que un aviso llegue al
 * teléfono con la aplicación cerrada.
 *
 * Vive en `pwa/` con el resto de lo que trata con el service worker (§87.1). Lo
 * que decide **qué** se avisa es del dominio y vive en `features/notifications`;
 * aquí solo está la mecánica del navegador.
 */

/** Lo que el backend necesita para poder mandarle un aviso a este dispositivo. */
export interface PushRegistration {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

/**
 * ¿Este navegador puede recibir avisos?
 *
 * Las tres piezas van juntas: sin service worker no hay quien reciba, sin
 * `PushManager` no hay suscripción, y sin `Notification` no hay permiso que
 * pedir. En iOS las tres solo existen con la PWA **instalada** en la pantalla de
 * inicio, así que en Safari a secas esto es `false` y la pantalla ofrece
 * instalarla en vez de un botón que no puede funcionar.
 */
export function pushSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/** El permiso tal como está ahora, sin pedir nada. */
export function pushPermission(): NotificationPermission | 'unsupported' {
  return pushSupported() ? Notification.permission : 'unsupported'
}

/**
 * La clave VAPID viaja en base64url y `subscribe()` la quiere en bytes.
 *
 * Es la conversión de siempre y no una librería: son ocho líneas y §63 pide no
 * añadir una dependencia por un detalle. `-` y `_` son base64url; el relleno con
 * `=` hay que reponerlo porque `atob` lo exige.
 *
 * El búfer se crea a mano para que el tipo sea `Uint8Array<ArrayBuffer>` y no
 * `<ArrayBufferLike>`: `applicationServerKey` no acepta un `SharedArrayBuffer`,
 * y sin esto `tsc` lo rechaza.
 */
export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(normalized)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i)
  return bytes
}

/** La suscripción de este navegador, si ya la hay. */
export async function currentPushSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

/**
 * Pide permiso y suscribe este navegador.
 *
 * Devuelve `null` si la persona dijo que no. **Ese no es un error que haya que
 * reintentar**: un permiso denegado no se vuelve a preguntar, y la pantalla lo
 * explica en vez de ofrecer otra vez el mismo botón.
 */
export async function subscribeToPush(publicKey: string): Promise<PushRegistration | null> {
  if (!pushSupported()) return null

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  const registration = await navigator.serviceWorker.ready
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      // Obligatorio en los navegadores de hoy, y además es lo que queremos: un
      // push silencioso que no enseña nada es lo que hace que se revoque el
      // permiso a la aplicación entera.
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }))

  return toRegistration(subscription)
}

/** Da de baja este navegador. Devuelve `false` si no había nada suscrito. */
export async function unsubscribeFromPush(): Promise<boolean> {
  const subscription = await currentPushSubscription()
  if (!subscription) return false
  return subscription.unsubscribe()
}

/** `PushSubscription` del navegador → lo que firma el contrato. */
export function toRegistration(subscription: PushSubscription): PushRegistration | null {
  const json = subscription.toJSON()
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth
  // Sin las dos claves el backend no puede cifrar nada: mandarlo a medias sería
  // registrar un dispositivo que nunca va a recibir.
  if (!json.endpoint || !p256dh || !auth) return null
  return { endpoint: json.endpoint, keys: { p256dh, auth } }
}

const BROWSERS: [RegExp, string][] = [
  // El orden importa: casi todos dicen ser Chrome y Safari además de lo suyo.
  [/Edg\//, 'Edge'],
  [/OPR\/|Opera/, 'Opera'],
  [/SamsungBrowser/, 'Samsung Internet'],
  [/Firefox|FxiOS/, 'Firefox'],
  [/CriOS|Chrome|Chromium/, 'Chrome'],
  [/Safari/, 'Safari'],
]

const SYSTEMS: [RegExp, string][] = [
  [/Android/, 'Android'],
  [/iPhone|iPad|iPod/, 'iPhone'],
  [/Macintosh|Mac OS X/, 'Mac'],
  [/Windows/, 'Windows'],
  [/Linux/, 'Linux'],
]

/**
 * Cómo se llama este aparato en la lista: «Chrome · Android».
 *
 * Es **una etiqueta, no una decisión**: nada depende de acertar, y por eso vale
 * una heurística sobre el `user-agent` en vez de una librería (§63). Lo que no
 * puede pasar es que tres dispositivos se llamen igual «Desconocido», así que
 * cuando algo no se reconoce se enseña lo que sí.
 */
export function deviceLabel(userAgent: string): string {
  const browser = BROWSERS.find(([re]) => re.test(userAgent))?.[1]
  const system = SYSTEMS.find(([re]) => re.test(userAgent))?.[1]
  const parts = [browser, system].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : 'Este dispositivo'
}

/*
  ---------- Qué fila de la lista es este aparato ----------

  El contrato devuelve `id`, `deviceLabel` y `lastUsedAt`, pero **no el
  `endpoint`**, así que no hay forma de cruzar la lista del servidor con la
  suscripción que tiene este navegador. Sin eso, tres filas que digan «Chrome ·
  Android» son indistinguibles y dar de baja «este» es adivinar.

  Lo que sí sabemos aquí es el `id` que nos devolvió el servidor al registrarnos,
  y a qué `endpoint` corresponde. Se guarda junto, para poder tirarlo cuando el
  navegador cambia de suscripción —que pasa: el push service la rota—. Pedido al
  backend como un campo más en `SYNC-STATUS.md`; el día que llegue, esto sobra.
*/

const DEVICE_KEY = 'nummo-push-device'

interface RememberedDevice {
  endpoint: string
  id: string
}

export function rememberPushDevice(endpoint: string, id: string): void {
  try {
    localStorage.setItem(DEVICE_KEY, JSON.stringify({ endpoint, id }))
  } catch {
    // Sin almacenamiento —modo privado, cuota llena— se pierde solo saber cuál
    // de las filas es esta. Todo lo demás sigue funcionando.
  }
}

export function forgetPushDevice(): void {
  try {
    localStorage.removeItem(DEVICE_KEY)
  } catch {
    // Igual que arriba: no poder olvidar no rompe nada.
  }
}

/**
 * El `id` que el servidor le dio a **esta** suscripción, o `null`.
 *
 * Se comprueba contra el `endpoint` actual a propósito: una nota guardada que
 * apunte a una suscripción que ya no existe señalaría la fila de otro aparato.
 */
export function rememberedPushDevice(endpoint: string | undefined): string | null {
  if (!endpoint) return null
  try {
    const raw = localStorage.getItem(DEVICE_KEY)
    if (!raw) return null
    const saved = JSON.parse(raw) as RememberedDevice
    return saved.endpoint === endpoint ? saved.id : null
  } catch {
    return null
  }
}
