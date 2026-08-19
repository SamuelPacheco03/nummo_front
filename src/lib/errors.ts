import { ApiError } from '@/api/http-client'
import type {
  ErrorResponseErrorCode,
  FeatureNotAvailableDetails,
  LimitExceededDetails,
} from '@/api/generated/model'

/**
 * El código del error, ya estrechado al **enum cerrado** del contrato.
 *
 * Que sea cerrado es lo que permite un `switch` exhaustivo: si el backend añade
 * un código, el compilador señala los sitios que no lo contemplan en vez de
 * dejarlos cayendo al caso genérico sin que nadie se entere.
 */
export function errorCode(error: unknown): ErrorResponseErrorCode | undefined {
  return error instanceof ApiError ? (error.code as ErrorResponseErrorCode) : undefined
}

/**
 * `403 ORGANIZATION_SUSPENDED` — la organización está en **solo lectura**.
 *
 * No es el fallo de una pantalla: es un modo de la aplicación entera (§45.4).
 * Consultar y exportar siguen funcionando; cualquier mutación responde esto.
 */
export function isOrganizationSuspended(error: unknown): boolean {
  return errorCode(error) === 'ORGANIZATION_SUSPENDED'
}

/**
 * `403 FEATURE_NOT_AVAILABLE` — el plan no lo incluye. Devuelve sus `details`,
 * que llegan con esquema propio: no hay que adivinar la forma.
 */
export function featureNotAvailable(error: unknown): FeatureNotAvailableDetails | null {
  if (errorCode(error) !== 'FEATURE_NOT_AVAILABLE') return null
  const details = (error as ApiError).details as Partial<FeatureNotAvailableDetails> | undefined
  return details?.feature ? { feature: details.feature, plan: details.plan ?? '' } : null
}

/**
 * `409 LIMIT_EXCEEDED` — se acabó el cupo. `used` es lo **ya gastado**, nunca
 * cuántos caben, y `period` solo viaja en las cuotas que se reinician cada mes.
 */
export function limitExceeded(error: unknown): LimitExceededDetails | null {
  if (errorCode(error) !== 'LIMIT_EXCEEDED') return null
  const details = (error as ApiError).details as Partial<LimitExceededDetails> | undefined
  if (!details?.limit || typeof details.max !== 'number' || typeof details.used !== 'number') {
    return null
  }
  return {
    limit: details.limit,
    max: details.max,
    used: details.used,
    ...(details.plan ? { plan: details.plan } : {}),
    ...(details.period ? { period: details.period } : {}),
  }
}

/** Mensajes amables para condiciones que el backend reporta de forma genérica (Fase 8). */
function friendlyForApiError(error: ApiError): string | null {
  if (error.status === 429 || error.code === 'RATE_LIMITED') {
    return 'Demasiados intentos. Espera unos segundos e inténtalo de nuevo.'
  }
  if (error.status === 413) {
    return 'El contenido es demasiado grande.'
  }
  if (isOrganizationSuspended(error)) {
    return 'Tu organización está en solo lectura: puedes consultar y exportar, pero no registrar ni modificar.'
  }
  return null
}

/** Mensaje legible desde cualquier error (ApiError del backend, Error, o desconocido). */
export function getErrorMessage(error: unknown, fallback = 'Ocurrió un error inesperado.'): string {
  if (error instanceof ApiError) return friendlyForApiError(error) ?? error.message ?? fallback
  if (error instanceof Error) return error.message
  return fallback
}

/** ¿El error es un status HTTP concreto? */
export function isApiStatus(error: unknown, status: number): boolean {
  return error instanceof ApiError && error.status === status
}
