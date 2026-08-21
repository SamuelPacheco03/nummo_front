import { ApiError } from '@/api/http-client'
import { asRecord, postEventStream } from '@/lib/sse'

/**
 * **Leer la respuesta de Numi mientras se escribe.**
 *
 * El transporte —POST, CSRF, troceado del flujo y la trampa del error que vuelve como
 * JSON en vez de como eventos— vive en `lib/sse.ts`, que es lo que comparte con el
 * playground del superadmin. Aquí queda lo propio del chat del inquilino: qué eventos
 * entiende y qué devuelve un turno.
 *
 * Lo que sí se respeta es el contrato de errores del resto de la app: un fallo sale como
 * `ApiError` con su `code` y su `details`, venga del status HTTP o del evento `error` a
 * mitad del flujo. Así el clasificador de Numi no tiene que saber por dónde llegó.
 */
export interface StreamChatInput {
  orgId: string
  message: string
  sessionId?: string
  /** Abortarla es el botón de detener. Lo ya escrito se queda. */
  signal: AbortSignal
  /** La conversación del turno, antes de que el modelo escriba nada. */
  onStart?: (sessionId: string) => void
  onChunk: (text: string) => void
}

export interface StreamChatResult {
  sessionId: string
  reply: string
  /** El usuario la cortó: la respuesta es lo que había hasta ese momento. */
  stopped: boolean
  /**
   * Ids con los que el servidor archivó el turno. El cliente los adopta para dejar de
   * llamar a sus mensajes por identificadores inventados: es lo que evita verlos dos
   * veces cuando llegan novedades del propio servidor.
   */
  userMessageId: string | null
  assistantMessageId: string | null
}

export async function streamChat(input: StreamChatInput): Promise<StreamChatResult> {
  let sessionId = input.sessionId ?? ''
  let reply = ''
  let done = false
  let userMessageId: string | null = null
  let assistantMessageId: string | null = null
  const partial = (stopped: boolean): StreamChatResult => ({
    sessionId,
    reply,
    stopped,
    userMessageId,
    assistantMessageId,
  })

  let status = 200
  try {
    status = await postEventStream({
      path: `/api/v1/organizations/${input.orgId}/assistant/chat/stream`,
      body: { message: input.message, sessionId: input.sessionId },
      signal: input.signal,
      onEvent: (event, data) => {
        const payload = asRecord(data)
        if (event === 'start' && typeof payload.sessionId === 'string') {
          sessionId = payload.sessionId
          input.onStart?.(sessionId)
        } else if (event === 'chunk' && typeof payload.text === 'string') {
          reply += payload.text
          input.onChunk(payload.text)
        } else if (event === 'done') {
          if (typeof payload.sessionId === 'string') sessionId = payload.sessionId
          /*
            Los ids con los que quedó archivado el turno. Sin ellos, el mensaje seguiría
            llamándose por el id que inventó el cliente, y lo que traiga novedades del
            servidor —otro dispositivo, una reconexión— lo vería como uno distinto y lo
            pintaría dos veces.
          */
          if (typeof payload.userMessageId === 'string') userMessageId = payload.userMessageId
          if (typeof payload.assistantMessageId === 'string') {
            assistantMessageId = payload.assistantMessageId
          }
          // El servidor manda la respuesta entera: es la que manda, por si algún
          // trozo se perdió por el camino.
          if (typeof payload.reply === 'string') reply = payload.reply
          done = true
        }
      },
    })
  } catch (error) {
    /*
      Detener no es fallar. El servidor guarda lo que alcanzó a escribir y aquí se
      devuelve lo mismo que el usuario está leyendo, con el `sessionId` que llegó en
      `start` — sin él, el siguiente mensaje abriría otra conversación.
    */
    if (input.signal.aborted) return partial(true)
    throw error
  }

  // Detener corta la lectura sin `done`, y a veces sin lanzar: cerrar el flujo es una
  // forma perfectamente limpia de terminar cuando quien lee ya no quiere más.
  if (input.signal.aborted) return partial(true)

  // Sin `done` y sin que nadie lo pidiera: la conexión se cayó.
  if (!done) {
    throw new ApiError(status, {
      code: 'INTERNAL',
      message: 'Se perdió la conexión mientras Numi respondía.',
    })
  }

  return partial(false)
}
