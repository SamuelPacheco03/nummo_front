import { ApiError } from '@/api/http-client'
import { getErrorMessage } from '@/lib/errors'
import type { NumiError, NumiQuota } from './types'

/**
 * Cómo se llama en cristiano cada tope que puede cortar una conversación.
 *
 * Son los dos que el chat puede gastar. Si mañana hay otro y no está aquí, el mensaje
 * cae al genérico —«se agotó una de las cuotas de tu plan»—, que es feo pero cierto;
 * nunca se enseña la clave cruda.
 */
const QUOTA_LABELS: Record<string, string> = {
  ai_messages_monthly: 'mensajes con Numi',
  voice_minutes_monthly: 'minutos de nota de voz',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Lee el `details` de un `LIMIT_EXCEEDED`. Devuelve null si no trae lo que promete:
 * el mensaje del backend ya es legible, así que ante la duda se usa ese y no se
 * inventan cifras.
 */
function readQuota(details: unknown): NumiQuota | null {
  if (!isRecord(details)) return null
  const { limit, max, used, period } = details
  if (typeof limit !== 'string' || typeof max !== 'number' || typeof used !== 'number') {
    return null
  }
  return { limit, max, used, period: typeof period === 'string' ? period : undefined }
}

/** «Llevas 2000 de 2000 mensajes con Numi este mes.» */
function quotaMessage(quota: NumiQuota): string {
  const label = QUOTA_LABELS[quota.limit]
  if (!label) return 'Se agotó una de las cuotas de tu plan.'
  // `period` solo viaja en los topes que se reinician, y es lo que permite decir
  // «este mes» sin prometer una fecha de renovación que no tenemos.
  const when = quota.period ? ' este mes' : ''
  return `Llevas ${quota.used} de ${quota.max} ${label}${when}.`
}

/**
 * Traduce el fallo de un turno a algo que la UI pueda usar para decidir qué ofrecer.
 *
 * El caso que motiva esto: sin clasificar, quedarse sin cuota se veía igual que
 * quedarse sin internet —«No se pudo contactar a Numi»— con un botón de reintentar
 * que iba a fallar exactamente igual todas las veces.
 */
export function classifyNumiError(error: unknown, fallback: string): NumiError {
  if (error instanceof ApiError) {
    if (error.code === 'LIMIT_EXCEEDED') {
      const quota = readQuota(error.details)
      return {
        kind: 'quota',
        message: quota ? quotaMessage(quota) : error.message,
        ...(quota ? { quota } : {}),
      }
    }
    if (error.code === 'FEATURE_NOT_AVAILABLE') {
      return { kind: 'plan', message: 'Tu plan no incluye esta función.' }
    }
    // 422 en el chat significa una sola cosa: todavía no hay proveedor de IA activo.
    if (error.status === 422) {
      return { kind: 'setup', message: getErrorMessage(error, fallback) }
    }
  }
  return { kind: 'generic', message: getErrorMessage(error, fallback) }
}

/**
 * ¿Tiene sentido volver a mandar el mismo mensaje?
 *
 * Solo cuando la causa puede haber cambiado sola. Sin proveedor, sin cuota o sin plan
 * el reintento está garantizado a fallar, y ofrecerlo es mandar al usuario a chocar
 * contra la misma pared.
 */
export function isRetryable(error: NumiError): boolean {
  return error.kind === 'generic'
}
