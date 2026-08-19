import { ApiError } from '@/api/http-client'
import { apiUrl } from '@/lib/api-config'
import { ensureCsrfToken } from '@/lib/csrf'

/**
 * **Leer la respuesta de Numi mientras se escribe.**
 *
 * No pasa por el cliente generado a propósito: orval consume el cuerpo entero antes de
 * devolverlo, que es exactamente lo que aquí no se puede hacer. Tampoco por
 * `EventSource`, que solo hace GET y no puede llevar la cabecera CSRF. Queda `fetch` con
 * POST y el cuerpo leído a mano.
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
}

interface ApiErrorBody {
  error?: { code: string; message: string; details?: unknown; requestId?: string }
}

function toApiError(status: number, body: unknown): ApiError {
  const payload = (body as ApiErrorBody | undefined)?.error
  return new ApiError(status, payload ?? { code: 'INTERNAL', message: 'Request failed' })
}

/**
 * Trocea el flujo en eventos completos.
 *
 * Un `read()` no corta por eventos: puede traer medio evento, o tres y pico. Lo que no
 * llegue entero se queda en el buffer para la vuelta siguiente — parsear a medias es
 * cómo se pierde una palabra por cada lectura.
 */
function takeEvents(buffer: string): { events: string[]; rest: string } {
  const parts = buffer.split('\n\n')
  return { events: parts.slice(0, -1), rest: parts.at(-1) ?? '' }
}

function parseEvent(raw: string): { event: string; data: unknown } | null {
  let event = 'message'
  const data: string[] = []
  for (const line of raw.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) data.push(line.slice(5).trim())
  }
  if (data.length === 0) return null
  try {
    return { event, data: JSON.parse(data.join('\n')) }
  } catch {
    // Un evento ilegible no tumba el turno: se ignora y sigue llegando el resto.
    return null
  }
}

export async function streamChat(input: StreamChatInput): Promise<StreamChatResult> {
  const token = await ensureCsrfToken()
  const headers = new Headers({ 'Content-Type': 'application/json', Accept: 'text/event-stream' })
  if (token) headers.set('x-csrf-token', token)

  const response = await fetch(apiUrl(`/api/v1/organizations/${input.orgId}/assistant/chat/stream`), {
    method: 'POST',
    headers,
    credentials: 'include',
    signal: input.signal,
    body: JSON.stringify({ message: input.message, sessionId: input.sessionId }),
  })

  // Todo lo que puede decidirse antes de empezar a responder llega como JSON normal.
  if (!response.ok || !response.body) {
    const body = await response.json().catch(() => undefined)
    throw toApiError(response.status, body)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let sessionId = input.sessionId ?? ''
  let reply = ''
  let done = false

  try {
    for (;;) {
      const { value, done: finished } = await reader.read()
      if (finished) break
      buffer += decoder.decode(value, { stream: true })
      const { events, rest } = takeEvents(buffer)
      buffer = rest

      for (const raw of events) {
        const parsed = parseEvent(raw)
        if (!parsed) continue
        const payload = parsed.data as Record<string, unknown>

        if (parsed.event === 'start' && typeof payload.sessionId === 'string') {
          sessionId = payload.sessionId
          input.onStart?.(sessionId)
        } else if (parsed.event === 'chunk' && typeof payload.text === 'string') {
          reply += payload.text
          input.onChunk(payload.text)
        } else if (parsed.event === 'done') {
          if (typeof payload.sessionId === 'string') sessionId = payload.sessionId
          // El servidor manda la respuesta entera: es la que manda, por si algún
          // trozo se perdió por el camino.
          if (typeof payload.reply === 'string') reply = payload.reply
          done = true
        } else if (parsed.event === 'error') {
          throw toApiError(response.status, payload)
        }
      }
    }
  } catch (error) {
    /*
      Detener no es fallar. El servidor guarda lo que alcanzó a escribir y aquí se
      devuelve lo mismo que el usuario está leyendo, con el `sessionId` que llegó en
      `start` — sin él, el siguiente mensaje abriría otra conversación.
    */
    if (input.signal.aborted) return { sessionId, reply, stopped: true }
    throw error
  }

  // Detener corta la lectura sin `done`, y a veces sin lanzar: cerrar el flujo es una
  // forma perfectamente limpia de terminar cuando quien lee ya no quiere más.
  if (input.signal.aborted) return { sessionId, reply, stopped: true }

  // Sin `done` y sin que nadie lo pidiera: la conexión se cayó.
  if (!done) {
    throw new ApiError(response.status, {
      code: 'INTERNAL',
      message: 'Se perdió la conexión mientras Numi respondía.',
    })
  }

  return { sessionId, reply, stopped: false }
}
