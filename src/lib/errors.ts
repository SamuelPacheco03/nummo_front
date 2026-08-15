import { ApiError } from '@/api/http-client'

/** Mensajes amables para condiciones que el backend reporta de forma genérica (Fase 8). */
function friendlyForApiError(error: ApiError): string | null {
  if (error.status === 429 || error.code === 'RATE_LIMITED') {
    return 'Demasiados intentos. Espera unos segundos e inténtalo de nuevo.'
  }
  if (error.status === 413) {
    return 'El contenido es demasiado grande.'
  }
  return null
}

/** Mensaje legible desde cualquier error (ApiError del backend, Error, o desconocido). */
export function getErrorMessage(error: unknown, fallback = 'Ocurrió un error inesperado.'): string {
  if (error instanceof ApiError) return friendlyForApiError(error) ?? error.message ?? fallback
  if (error instanceof Error) return error.message
  return fallback
}

/** Código de error del backend (VALIDATION, CONFLICT, …) si aplica. */
export function getErrorCode(error: unknown): string | undefined {
  return error instanceof ApiError ? error.code : undefined
}

/** ¿El error es un status HTTP concreto? */
export function isApiStatus(error: unknown, status: number): boolean {
  return error instanceof ApiError && error.status === status
}
