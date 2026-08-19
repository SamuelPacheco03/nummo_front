import { useEffect } from 'react'
import { subscribeToRealtime } from '@/lib/realtime-stream'

/** Lo del stream que le interesa al chat. Lo demás —notificaciones, listas— no es suyo. */
export interface NumiEvent {
  kind: 'message' | 'conversation'
  conversationId?: string
}

/**
 * **Enterarse de lo que pasó en otro dispositivo.**
 *
 * Se engancha al stream de la aplicación, que es **uno solo para todo el producto**: el
 * chat no abre su propia conexión, porque una pestaña con una por función acabaría con
 * cuatro diciendo lo mismo.
 *
 * Lo que llega es una señal, no el contenido: dice que algo se movió y quien lo recibe va
 * a buscarlo. Esa asimetría es lo que hace el diseño sencillo — la puesta al día es la
 * misma llamada tanto si llegó un aviso como si acabamos de reconectar, así que hay un
 * solo camino por el que entran mensajes al hilo.
 *
 * La suscripción vive lo que viva quien llama a este hook. En la práctica eso es el panel
 * abierto, que se desmonta al cerrarlo.
 */
export function useNumiEvents(
  orgId: string | undefined,
  onEvent: (event: NumiEvent) => void,
): void {
  useEffect(() => {
    return subscribeToRealtime(orgId, (event) => {
      if (event.kind !== 'message' && event.kind !== 'conversation') return
      onEvent({ kind: event.kind, conversationId: event.conversationId })
    })
  }, [orgId, onEvent])
}
