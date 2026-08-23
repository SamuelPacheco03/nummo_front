/**
 * Un flujo de eventos que el test abre y cierra a mano.
 *
 * El chat de Numi llega por Server-Sent Events, así que probarlo es probar **el
 * intervalo**: qué se ve mientras la respuesta se escribe, qué pasa si se corta a la
 * mitad, qué queda si nunca termina. Una respuesta ya completa no tiene ese intervalo,
 * y es justo donde vive todo lo que hay que comprobar.
 */
export interface SseChannel {
  /** La respuesta que devuelve el `fetch` mockeado. */
  response: Response
  /**
   * La conversación del turno, antes de la primera palabra.
   *
   * `sessionId` admite `null` porque un turno con foto lo trae así cuando la
   * conversación nace de esa misma imagen: el id lo crea el turno de chat, que va
   * después de la lectura. `extra` es lo que ese turno añade —`documentId`,
   * `alreadyFiled`— sin obligar a un segundo canal de mentira.
   */
  start(sessionId: string | null, extra?: Record<string, unknown>): void
  chunk(text: string): void
  done(sessionId: string, reply: string, stopped?: boolean, extra?: Record<string, unknown>): void
  /**
   * `done` sin cerrar el cuerpo: el servidor ya dijo todo lo que tenía que decir y la
   * conexión todavía tarda en irse (un proxy, su keep-alive). Es el caso que dejaba el
   * botón de detener puesto sobre una respuesta ya terminada.
   */
  doneWithoutClosing(sessionId: string, reply: string): void
  /**
   * La traza del turno (playground). Va entre el último trozo y `done`, y su cuerpo
   * puede ser la traza entera o `null` — el turno contestó pero no dejó medida.
   */
  trace(value: unknown): void
  /** Un fallo a mitad del flujo, con el cuerpo de error de siempre. */
  fail(code: string, message: string, details?: unknown): void
  /** Cierra sin `done`: la conexión se cayó. */
  close(): void
}

function frame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export function sseChannel(): SseChannel {
  const encoder = new TextEncoder()
  let controller: ReadableStreamDefaultController<Uint8Array>
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c
    },
  })

  const push = (event: string, data: unknown) => {
    controller.enqueue(encoder.encode(frame(event, data)))
  }

  return {
    response: new Response(stream, {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    }),
    start: (sessionId, extra) => push('start', { sessionId, ...extra }),
    chunk: (text) => push('chunk', { text }),
    trace: (value) => push('trace', value),
    done: (sessionId, reply, stopped = false, extra) => {
      push('done', { sessionId, reply, stopped, ...extra })
      controller.close()
    },
    doneWithoutClosing: (sessionId, reply) => push('done', { sessionId, reply, stopped: false }),
    fail: (code, message, details) => {
      push('error', { error: { code, message, ...(details ? { details } : {}) } })
      controller.close()
    },
    close: () => controller.close(),
  }
}
