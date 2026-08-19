import { apiUrl } from '@/lib/api-config'

/**
 * Lo que llega por el stream de la aplicación.
 *
 * Son **avisos, nunca datos**: dicen que algo se movió, y quien lo recibe lo pide por su
 * endpoint de siempre. Es la misma llamada que se hace al reconectar, así que hay un solo
 * camino por el que entran los datos y el stream no tiene que garantizar orden ni entrega
 * — un aviso emitido sin cobertura se pierde y no pasa nada.
 */
export type RealtimeEventKind = 'notification' | 'message' | 'conversation' | 'resource'

export interface RealtimeEvent {
  kind: RealtimeEventKind
  /** En `message` y `conversation`. */
  conversationId?: string
  /** En `notification`. */
  notificationId?: string
  /** En `resource`: qué lista se quedó vieja (`receivables`, `payments`…). */
  resource?: string
}

type Handler = (event: RealtimeEvent) => void

const KINDS: RealtimeEventKind[] = ['notification', 'message', 'conversation', 'resource']

/**
 * **Una conexión para toda la aplicación, no una por función.**
 *
 * El servidor unificó su stream justo para esto: una pestaña que abriera un `EventSource`
 * por cada cosa que quiere enterarse acabaría con cuatro conexiones diciendo lo mismo. Así
 * que la conexión vive aquí y quien la necesite se suscribe.
 *
 * Se cuenta a los suscriptores: se abre con el primero y se cierra con el último. Sin eso,
 * una conexión abierta con nadie escuchando se paga igual en el servidor.
 */
let current: { orgId: string; source: EventSource; handlers: Set<Handler> } | null = null

function close(): void {
  if (!current) return
  current.source.close()
  current = null
}

/**
 * Escucha el stream de la organización. Devuelve la función para darse de baja, que hay
 * que llamar siempre: es la que cierra la conexión cuando se va el último.
 */
export function subscribeToRealtime(orgId: string | undefined, handler: Handler): () => void {
  // `EventSource` no existe en jsdom ni en un render de servidor. Sin él no hay avisos en
  // vivo y ya está: quien lo use se pone al día igual al montar.
  if (!orgId || typeof EventSource === 'undefined') return () => undefined

  // Cambiar de organización es otro stream: el anterior habla de datos que ya no son estos.
  if (current && current.orgId !== orgId) close()

  if (!current) {
    const source = new EventSource(apiUrl(`/api/v1/organizations/${orgId}/events`), {
      withCredentials: true,
    })
    const handlers = new Set<Handler>()
    current = { orgId, source, handlers }

    for (const kind of KINDS) {
      source.addEventListener(kind, ((event: MessageEvent<string>) => {
        try {
          const data = JSON.parse(event.data) as Omit<RealtimeEvent, 'kind'>
          for (const h of handlers) h({ kind, ...data })
        } catch {
          // Un aviso ilegible no puede romper la pantalla: lo peor es enterarse un poco
          // más tarde, en el siguiente o al volver a montar.
        }
      }) as EventListener)
    }

    /*
      No se reintenta a mano al fallar: `EventSource` reconecta solo, con su propia espera.
      Cerrarlo aquí sería justo perder esa reconexión y quedarse mudo. El latido que manda
      el servidor cada 25 s es un comentario SSE y no llega como evento: no hay que hacer
      nada con él.
    */
  }

  current.handlers.add(handler)

  return () => {
    if (!current) return
    current.handlers.delete(handler)
    if (current.handlers.size === 0) close()
  }
}
