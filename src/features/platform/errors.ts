import { toast } from 'sonner'
import { featureNotAvailable, getErrorMessage, limitExceeded } from '@/lib/errors'
import { featureLabel, isPeriodicLimit, limitLabel, planLabel } from './labels'

/**
 * Lo que hay que decir cuando el que falla es el **plan** y no la petición.
 *
 * Son los dos errores de la Fase 9 del backend, y la respuesta correcta a
 * ninguno de los dos es «algo salió mal»:
 *
 * - `FEATURE_NOT_AVAILABLE` (403) — el plan no lo incluye. Se sale mejorando.
 * - `LIMIT_EXCEEDED` (409) — sí lo incluye, pero se acabó el cupo. Se sale
 *   liberando espacio **o** mejorando; y si el tope se reinicia cada mes, además
 *   esperando.
 *
 * Devuelve `null` para cualquier otro error, que es lo que deja a
 * `toastApiError` seguir con el mensaje de siempre.
 */
export function planErrorMessage(error: unknown): { title: string; description: string } | null {
  const feature = featureNotAvailable(error)
  if (feature) {
    return {
      title: `Tu plan ${planLabel(feature.plan)} no incluye ${featureLabel(feature.feature)}`,
      description: 'Está disponible en un plan superior: míralos en Configuración › Plan.',
    }
  }

  const limit = limitExceeded(error)
  if (limit) {
    // Sin «de tu plan» a propósito: `free_organizations` llega por esta misma vía
    // y **no** sale de un plan, sino del anti-abuso de organizaciones gratuitas.
    const nombre = limitLabel(limit.limit)
    return isPeriodicLimit(limit.limit)
      ? {
          title: `Se acabaron tus ${nombre} de este mes`,
          // `used` es lo ya gastado, nunca lo que queda.
          description: `Llevas ${limit.used} de ${limit.max}. Se renueva el mes que viene, o mejora de plan en Configuración › Plan.`,
        }
      : {
          title: `Llegaste al tope de ${nombre}`,
          description: `Tienes ${limit.used} de ${limit.max}. Libera espacio, o mejora de plan en Configuración › Plan.`,
        }
  }

  return null
}

/**
 * **La forma de contar que una mutación falló.** Una sola, para que los dos
 * errores de plan no dependan de que cada pantalla se acuerde de ellos.
 *
 * Con cualquier otro error hace lo de siempre: `toast.error(getErrorMessage(…))`.
 */
export function toastApiError(error: unknown, fallback?: string): void {
  const plan = planErrorMessage(error)
  if (plan) {
    toast.error(plan.title, { description: plan.description })
    return
  }
  toast.error(getErrorMessage(error, fallback))
}
