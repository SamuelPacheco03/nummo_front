/**
 * Manejo del token CSRF (double-submit) del backend.
 *
 * Flujo (ver HANDOFF-fase-1): al cargar la app y tras login/logout se pide
 * `GET /api/v1/auth/csrf` → `{ csrfToken }` (también setea la cookie CSRF).
 * El token es SESSION-BOUND: cambia con la sesión, por eso hay que re-pedirlo
 * tras autenticarse o cerrar sesión.
 */
import { apiUrl } from './api-config'

const CSRF_URL = '/api/v1/auth/csrf'

let cachedToken: string | null = null
let inflight: Promise<string | null> | null = null

async function requestToken(): Promise<string | null> {
  try {
    const res = await fetch(apiUrl(CSRF_URL), {
      credentials: 'include',
      headers: { accept: 'application/json' },
    })
    if (!res.ok) return null
    const body = (await res.json()) as { csrfToken?: string }
    cachedToken = body.csrfToken ?? null
    return cachedToken
  } catch {
    return null
  } finally {
    inflight = null
  }
}

/** Devuelve el token (cacheado) o lo pide una sola vez si no existe. */
export async function ensureCsrfToken(): Promise<string | null> {
  if (cachedToken) return cachedToken
  inflight ??= requestToken()
  return inflight
}

/** Olvida el token cacheado (llamar tras login/logout). */
export function clearCsrfToken(): void {
  cachedToken = null
  inflight = null
}

/** Fuerza un re-fetch del token (tras login/logout la sesión cambió). */
export async function refreshCsrfToken(): Promise<string | null> {
  clearCsrfToken()
  return ensureCsrfToken()
}
