import { apiUrl } from '@/lib/api-config'
import { ensureCsrfToken } from '@/lib/csrf'

/**
 * Mutator de Orval (httpClient: 'fetch').
 *
 * El cliente fetch de Orval espera que el mutator devuelva el envoltorio
 * `{ status, data, headers }` (no el body crudo). Por eso los hooks exponen
 * la carga real en `response.data`.
 *
 * Reglas del contrato (ver HANDOFF fases 0/1):
 *  - `credentials: 'include'` para que fluyan las cookies HttpOnly (sesión + CSRF).
 *  - En mutaciones (POST/PUT/PATCH/DELETE) manda `x-csrf-token`.
 *  - Las rutas se anteponen con `API_BASE_URL` (env `VITE_API_BASE_URL`): vacío =
 *    mismo origen (el proxy de Vite reenvía al backend en dev); con valor = otro dominio.
 *  - Errores con forma `{ error: { code, message, details?, requestId } }` → lanza ApiError.
 */
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

interface ApiErrorPayload {
  code: string
  message: string
  details?: unknown
  requestId?: string
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown
  readonly requestId?: string

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message)
    this.name = 'ApiError'
    this.status = status
    this.code = payload.code
    this.details = payload.details
    this.requestId = payload.requestId
  }
}

type UnauthorizedHandler = () => void
let onUnauthorized: UnauthorizedHandler | null = null

/** Registrar un handler global para respuestas 401 (Fase 1: redirigir a login). */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) return undefined
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) return response.json()
  const text = await response.text()
  return text.length > 0 ? text : undefined
}

export const customFetch = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
  const method = (options.method ?? 'GET').toUpperCase()
  const headers = new Headers(options.headers)

  if (MUTATION_METHODS.has(method)) {
    const token = await ensureCsrfToken()
    if (token) headers.set('x-csrf-token', token)
  }
  // Solo JSON para cuerpos JSON. Un FormData (notas de voz) debe llevar el
  // `multipart/form-data; boundary=…` que pone el navegador: si lo etiquetamos como
  // JSON, el backend intenta parsear el boundary y responde "is not valid JSON".
  const bodyIsSelfDescribing =
    options.body instanceof FormData ||
    options.body instanceof Blob ||
    options.body instanceof URLSearchParams
  if (options.body != null && !bodyIsSelfDescribing && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(apiUrl(url), {
    ...options,
    method,
    headers,
    credentials: 'include',
  })

  if (response.status === 401) {
    onUnauthorized?.()
  }

  const data = await parseBody(response)

  if (!response.ok) {
    const errBody = (data as { error?: ApiErrorPayload } | undefined)?.error
    throw new ApiError(
      response.status,
      errBody ?? { code: 'INTERNAL', message: response.statusText || 'Request failed' },
    )
  }

  return { status: response.status, data, headers: response.headers } as T
}
