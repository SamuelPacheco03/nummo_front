import { ApiError } from '@/api/http-client'
import type { ScheduleFixedByLawDetails, SendTimeOutOfRangeDetails } from '@/api/generated/model'

/**
 * Los dos rechazos propios del `PUT` de la política, **leídos del `details`**.
 *
 * No llegan como código de primer nivel: el catálogo de `error.code` es cerrado y
 * los dos viajan dentro de un `VALIDATION` corriente, distinguidos por
 * `details.reason`. El contrato los publica con esquema propio y `reason` como
 * `const`, así que TypeScript estrecha la unión solo — aquí únicamente hay que
 * comprobar en tiempo de ejecución lo que el tipo no puede saber.
 *
 * Un 422 **sin `reason`** es un fallo de esquema normal y no pasa por aquí: cae
 * al mensaje genérico, que es lo correcto.
 */
function detailsOf(error: unknown): { reason?: string } | undefined {
  return error instanceof ApiError
    ? (error.details as { reason?: string } | undefined)
    : undefined
}

/**
 * La hora de envío cae fuera de la franja legal. Trae **el rango con el que
 * escribir el mensaje**, así que la pantalla no tiene que codificarlo: decir
 * «entre 08:00 y 14:59» a mano sería la ley escrita en el front.
 */
export function sendTimeOutOfRange(error: unknown): SendTimeOutOfRangeDetails | null {
  const details = detailsOf(error)
  return details?.reason === 'SEND_TIME_OUT_OF_RANGE'
    ? (details as SendTimeOutOfRangeDetails)
    : null
}

/**
 * Se mandó un campo de horario que fija la ley. **No debería pasar nunca** —el
 * formulario ya no los manda y el tipo del cuerpo tampoco los admite—, pero se
 * lee igual: si algún día vuelve a colarse, el aviso dice qué campos fueron y
 * bajo qué norma, en vez de un «datos inválidos» que no lleva a ninguna parte.
 */
export function scheduleFixedByLaw(error: unknown): ScheduleFixedByLawDetails | null {
  const details = detailsOf(error)
  return details?.reason === 'SCHEDULE_FIXED_BY_LAW' ? (details as ScheduleFixedByLawDetails) : null
}

/**
 * Se intentó encender la cobranza sin teléfono ni correo de la empresa.
 *
 * **El contrato no lo declara todavía** —`CollectionPolicyErrorDetails` sigue con
 * dos ramas y `ORGANIZATION_CONTACT_REQUIRED` no aparece en el JSON—, así que no
 * hay tipo que estrechar y aquí solo se mira el motivo. Es lo único que hace
 * falta para el mensaje: los dos campos que pide ya los sabe la pantalla, porque
 * es ella la que los ofrece.
 */
export function organizationContactRequired(error: unknown): boolean {
  return detailsOf(error)?.reason === 'ORGANIZATION_CONTACT_REQUIRED'
}
