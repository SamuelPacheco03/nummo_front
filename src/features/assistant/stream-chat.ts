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
  /**
   * Con foto el turno sale por `/chat/image/stream`, que es la misma puerta contada de
   * otra forma: misma conversación, mismos eventos y multipart en vez de JSON.
   *
   * Va aquí y no en una función aparte porque lo único que cambia es la ruta y el
   * cuerpo; el resto —qué eventos entiende un turno, qué significa detenerlo, cómo se
   * cuenta una conexión caída— es idéntico, y duplicarlo era garantizar que se
   * arreglara en uno de los dos.
   */
  image?: File
  /** Abortarla es el botón de detener. Lo ya escrito se queda. */
  signal: AbortSignal
  /**
   * **La primera señal de vida del servidor**, y por eso no lleva argumentos: lo que
   * dice es «ya lo tengo», no qué tiene. Es lo que marca el mensaje como entregado.
   *
   * Con foto sale en cuanto la imagen está archivada, sin esperar a que el modelo de
   * visión la lea — que es la parte larga.
   */
  onStart?: () => void
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
  /**
   * El documento con el que quedó archivada la foto, si el turno llevaba una. Es lo que
   * deja repintar la miniatura al volver, cuando el `blob:` de esta página ya no está.
   */
  documentId: string | null
}

export async function streamChat(input: StreamChatInput): Promise<StreamChatResult> {
  let sessionId = input.sessionId ?? ''
  let reply = ''
  let done = false
  let userMessageId: string | null = null
  let assistantMessageId: string | null = null
  let documentId: string | null = null
  const partial = (stopped: boolean): StreamChatResult => ({
    sessionId,
    reply,
    stopped,
    userMessageId,
    assistantMessageId,
    documentId,
  })

  /*
    Con foto, multipart; sin ella, el JSON de siempre. El transporte mira el tipo del
    cuerpo y elige la cabecera, así que aquí solo hay que decidir qué se manda.
  */
  const form = input.image && new FormData()
  if (form && input.image) {
    form.append('image', input.image)
    if (input.sessionId) form.append('sessionId', input.sessionId)
    if (input.message !== '') form.append('message', input.message)
  }

  let status = 200
  try {
    status = await postEventStream({
      path: form
        ? `/api/v1/organizations/${input.orgId}/assistant/chat/image/stream`
        : `/api/v1/organizations/${input.orgId}/assistant/chat/stream`,
      body: form ?? { message: input.message, sessionId: input.sessionId },
      signal: input.signal,
      onEvent: (event, data) => {
        const payload = asRecord(data)
        if (event === 'start') {
          /*
            El aviso sale con el evento, no con lo que traiga: en un turno con foto
            `sessionId` puede venir `null` —la conversación nace del turno de chat, que
            es posterior a la lectura— y esperar a tenerlo dejaría el mensaje sin marcar
            como entregado justo en el turno que más tarda. `done` trae el definitivo.
          */
          if (typeof payload.sessionId === 'string') sessionId = payload.sessionId
          if (typeof payload.documentId === 'string') documentId = payload.documentId
          input.onStart?.()
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
          if (typeof payload.documentId === 'string') documentId = payload.documentId
          // El servidor manda la respuesta entera: es la que manda, por si algún
          // trozo se perdió por el camino.
          if (typeof payload.reply === 'string') reply = payload.reply
          done = true
        }
      },
      /*
        **El turno termina en `done`, no cuando se cierre la conexión.** Lo resuelve el
        transporte (`lib/sse.ts`), que suelta el flujo en cuanto llega ese evento: entre
        el último evento y el cierre están el proxy y su keep-alive, y esperarlos dejaba
        el botón de detener puesto sobre una respuesta ya terminada.
      */
      endsOn: 'done',
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
