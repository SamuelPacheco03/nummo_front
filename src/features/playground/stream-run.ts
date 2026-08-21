import { ApiError } from '@/api/http-client'
import { asRecord, postEventStream } from '@/lib/sse'
import type { PlaygroundChatInput, PlaygroundTrace } from '@/api/generated/model'

/**
 * **Un turno del playground**, leído mientras se escribe.
 *
 * Es el mismo transporte del chat del inquilino (`lib/sse.ts`) con **cinco** eventos en
 * vez de cuatro: entre `chunk` y `done` llega `trace`, que es todo lo que costó el turno.
 *
 * La traza puede venir `null` —el pipeline contestó pero no dejó medida—, y eso no es un
 * fallo: la respuesta vale igual y el panel lo dice en vez de fingir ceros.
 */
export interface RunTurnInput {
  body: PlaygroundChatInput
  /** Abortarla es el botón de detener. Lo ya escrito se guarda en el servidor. */
  signal: AbortSignal
  onStart?: (sessionId: string) => void
  onChunk: (text: string) => void
}

export interface RunTurnResult {
  sessionId: string
  reply: string
  /** Lo paró quien lo lanzó: la respuesta es lo que había hasta ese momento. */
  stopped: boolean
  trace: PlaygroundTrace | null
}

export async function runTurn(input: RunTurnInput): Promise<RunTurnResult> {
  let sessionId = input.body.sessionId ?? ''
  let reply = ''
  let trace: PlaygroundTrace | null = null
  let done = false
  const partial = (stopped: boolean): RunTurnResult => ({ sessionId, reply, stopped, trace })

  let status = 200
  try {
    status = await postEventStream({
      path: '/api/v1/admin/playground/chat',
      body: input.body,
      signal: input.signal,
      onEvent: (event, data) => {
        /*
          `trace` es el único evento cuyo cuerpo **es** el dato y puede ser `null`, así
          que se mira antes de estrechar a objeto de campos.
        */
        if (event === 'trace') {
          trace = (data as PlaygroundTrace | null) ?? null
          return
        }
        const payload = asRecord(data)
        if (event === 'start' && typeof payload.sessionId === 'string') {
          sessionId = payload.sessionId
          input.onStart?.(sessionId)
        } else if (event === 'chunk' && typeof payload.text === 'string') {
          reply += payload.text
          input.onChunk(payload.text)
        } else if (event === 'done') {
          if (typeof payload.sessionId === 'string') sessionId = payload.sessionId
          // La respuesta entera del servidor manda, por si algún trozo se perdió.
          if (typeof payload.reply === 'string') reply = payload.reply
          done = true
        }
      },
    })
  } catch (error) {
    // Detener no es fallar: el servidor guarda lo escrito y aquí se devuelve lo mismo
    // que se está leyendo.
    if (input.signal.aborted) return partial(true)
    throw error
  }

  if (input.signal.aborted) return partial(true)

  if (!done) {
    throw new ApiError(status, {
      code: 'INTERNAL',
      message: 'Se perdió la conexión mientras Numi respondía.',
    })
  }

  return partial(false)
}
