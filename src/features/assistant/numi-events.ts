import { useEffect } from 'react'
import { apiUrl } from '@/lib/api-config'

/** Lo que el servidor manda por el flujo de avisos. */
export interface NumiEvent {
  kind: 'message' | 'conversation'
  conversationId?: string
}

/**
 * **Enterarse de lo que pasó en otro dispositivo.**
 *
 * El flujo vive lo que viva quien llama a este hook. En la práctica eso es el panel
 * abierto, que se desmonta al cerrarlo: con el chat cerrado no hay nada que actualizar y
 * una conexión de más se paga en el servidor. Lo que llega es una señal, no el
 * contenido: dice que algo se movió, y quien lo recibe va a buscarlo. Esa asimetría es lo
 * que hace el diseño sencillo — la puesta al día es la misma llamada tanto si llegó un
 * aviso como si acabamos de reconectar, así que hay un solo camino por el que entran
 * mensajes al hilo.
 *
 * Se usa `EventSource` a propósito: la cookie de sesión viaja sola, leer no necesita CSRF
 * y **reconectar es gratis** — lo hace el navegador, con su propia espera. Perder avisos
 * mientras estuvo caído no importa, porque al volver se pregunta por todo lo nuevo de una
 * vez.
 */
export function useNumiEvents(
  orgId: string | undefined,
  onEvent: (event: NumiEvent) => void,
): void {
  useEffect(() => {
    // `EventSource` no existe en jsdom ni en un render de servidor. Sin él no hay avisos
    // en vivo y ya está: la puesta al día al abrir el panel sigue funcionando.
    if (!orgId || typeof EventSource === 'undefined') return

    const source = new EventSource(apiUrl(`/api/v1/organizations/${orgId}/assistant/events`), {
      withCredentials: true,
    })

    const handle = (kind: NumiEvent['kind']) => (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data) as { conversationId?: string }
        onEvent({ kind, conversationId: data.conversationId })
      } catch {
        // Un aviso ilegible no puede romper el panel: lo peor es enterarse un poco
        // más tarde, en el siguiente evento o al reabrir.
      }
    }

    const onMessage = handle('message')
    const onConversation = handle('conversation')
    source.addEventListener('message', onMessage as EventListener)
    source.addEventListener('conversation', onConversation as EventListener)

    /*
      No se cierra ni se reintenta a mano cuando la conexión falla: `EventSource` reconecta
      solo. Cerrarlo aquí sería justo perder esa reconexión y quedarse mudo hasta que el
      usuario reabriera el panel.
    */

    return () => {
      source.removeEventListener('message', onMessage as EventListener)
      source.removeEventListener('conversation', onConversation as EventListener)
      source.close()
    }
  }, [orgId, onEvent])
}
