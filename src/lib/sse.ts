import { ApiError } from '@/api/http-client'
import { apiUrl } from '@/lib/api-config'
import { ensureCsrfToken } from '@/lib/csrf'

/**
 * **Leer una respuesta mientras se escribe**: Server-Sent Events sobre POST.
 *
 * No pasa por el cliente generado a propósito: orval consume el cuerpo entero antes de
 * devolverlo, que es exactamente lo que aquí no se puede hacer. Tampoco por
 * `EventSource`, que solo hace GET y no puede llevar la cabecera CSRF. Queda `fetch` con
 * POST y el cuerpo leído a mano.
 *
 * Vive en `lib/` porque **son dos los que hablan así**: el chat de Numi del inquilino y
 * el playground del superadmin. Lo que cambia entre ellos es la ruta, el cuerpo y qué
 * eventos entiende cada uno; el troceado del flujo, el CSRF y la trampa del error que no
 * llega como flujo son idénticos, y duplicarlos era garantizar que se arreglaran una vez
 * (CLAUDE.md: «nada por duplicado»).
 */
interface ApiErrorBody {
  error?: { code: string; message: string; details?: unknown; requestId?: string }
}

/** Un cuerpo de error del contrato —`{ error: { code, message } }`— como `ApiError`. */
export function toApiError(status: number, body: unknown): ApiError {
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

export interface EventStreamInput {
  /** Ruta del API, sin la base (`/api/v1/...`). */
  path: string
  /**
   * Lo que se manda. Un objeto viaja como JSON; un `FormData` va tal cual, que es
   * como se sube una imagen.
   *
   * El `Content-Type` del multipart lo pone el navegador, porque tiene que llevar el
   * `boundary`: escribirlo aquí lo dejaría sin él y el servidor no sabría dónde
   * empieza cada parte.
   */
  body: unknown
  /** Abortarla es el botón de detener. Lo ya escrito se queda. */
  signal: AbortSignal
  /**
   * El evento que **cierra el flujo**, si lo hay.
   *
   * Sin esto se sigue leyendo hasta que el cuerpo se acaba, y eso puede tardar: entre el
   * último evento y el cierre están el proxy y su keep-alive. Lo que se veía era el botón
   * de detener puesto unos segundos sobre una respuesta ya terminada, ofreciendo cortar
   * algo que no seguía escribiéndose.
   *
   * Con el evento final ya llegó todo lo que hacía falta —la respuesta entera y los ids—,
   * así que se suelta el flujo ahí mismo. Cancelar un cuerpo que ya se cerró no falla, y
   * si fallara daría igual: el turno terminó bien.
   */
  endsOn?: string
  /**
   * Cada evento completo, en orden de llegada.
   *
   * El dato llega **sin estrechar** porque no todos los eventos son objetos: la traza del
   * playground viaja como el objeto entero o como `null`, y prometer aquí un
   * `Record<string, unknown>` haría que leerle un campo reventara justo en el caso que
   * el contrato admite. Quien lo recibe lo estrecha, con `asRecord` si le sirve.
   */
  onEvent: (event: string, data: unknown) => void
}

/** Un evento como objeto de campos. Lo que no lo sea se lee como vacío, no revienta. */
export function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

/**
 * Abre el flujo y va entregando eventos hasta que el servidor cierra.
 *
 * Lanza `ApiError`:
 *
 * - **Antes del primer trozo**, cuando el fallo se decide sin haber empezado a responder
 *   —sin proveedor, organización suspendida, sin clave—. Eso vuelve como **JSON normal
 *   con su status**, no como flujo, y por eso se mira el `content-type` antes de abrir el
 *   lector: tratar un cuerpo JSON como flujo de eventos no produce ningún evento y la
 *   pantalla se queda esperando a un turno que ya falló.
 * - **A mitad del flujo**, cuando llega un evento `error`.
 *
 * Abortar propaga el error de aborto: quien llama sabe si eso fue «detener» (y entonces
 * lo escrito vale) o un fallo de verdad.
 *
 * Devuelve el status con el que abrió el flujo, para que un corte a media respuesta se
 * pueda contar con el mismo status que traía la conexión en vez de inventar uno.
 */
export async function postEventStream(input: EventStreamInput): Promise<number> {
  const token = await ensureCsrfToken()
  const form = input.body instanceof FormData ? input.body : null
  const headers = new Headers({ Accept: 'text/event-stream' })
  if (!form) headers.set('Content-Type', 'application/json')
  if (token) headers.set('x-csrf-token', token)

  const response = await fetch(apiUrl(input.path), {
    method: 'POST',
    headers,
    credentials: 'include',
    signal: input.signal,
    body: form ?? JSON.stringify(input.body),
  })

  const isStream = (response.headers.get('content-type') ?? '').includes('text/event-stream')
  if (!response.ok || !response.body || !isStream) {
    const body = await response.json().catch(() => undefined)
    throw toApiError(response.status, body)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const { events, rest } = takeEvents(buffer)
    buffer = rest

    for (const raw of events) {
      const parsed = parseEvent(raw)
      if (!parsed) continue
      if (parsed.event === 'error') throw toApiError(response.status, parsed.data)
      input.onEvent(parsed.event, parsed.data)
      if (parsed.event === input.endsOn) {
        void reader.cancel().catch(() => {})
        return response.status
      }
    }
  }

  return response.status
}
