import { useBranches, useMembers } from '@/features/config/hooks'
import { useContacts } from '@/features/contacts/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { useCapabilities } from './hooks'
import type { LimitMap } from '@/api/generated/model'
import { isPeriodicLimit, LIMIT_KEYS, limitLabel } from './labels'

/*
  Vive aparte de `hooks.ts` y no dentro por una razón de peso, literalmente: el
  sidebar importa `usePlatformAccess`, y con el conteo aquí dentro arrastraría al
  bundle inicial los hooks de contactos y de configuración, que solo hacen falta
  en una pantalla que se carga bajo demanda.
*/

/**
 * Lo que hay que saber de un tope para pintarlo.
 *
 * `used` puede ser `null` mientras se cuenta, y `max` puede serlo de verdad:
 * **un tope en `null` es «sin límite», nunca cero.**
 */
export interface LimitUsage {
  key: string
  /** Lo que cuenta, en plural: «contactos», «minutos de voz». */
  label: string
  used: number | null
  max: number | null
  /** Se reinicia cada mes (`period`) en vez de contar filas que existen ahora. */
  periodic: boolean
}

/**
 * **Cuánto llevas de cada tope.** Los dos tipos salen de sitios distintos, y no
 * por capricho del backend:
 *
 * - Las **cuotas mensuales** (Numi, voz) las lleva el servidor en `usage`, que es
 *   donde se cobran; se reinician cambiando de `period`, sin ningún job.
 * - Los **aforos** (contactos, miembros, sedes) cuentan filas que existen ahora,
 *   así que el conteo lo tiene la propia lista. Contar contactos pide una página
 *   de uno: lo que interesa es el `total`, no los datos.
 *
 * Contactos va con `isActive: 'true'` porque **lo archivado no gasta cupo**, que
 * es justo lo que hace que archivar sea una salida cuando el aforo se llena.
 */
export function useLimitUsage(): { limits: LimitUsage[]; period: string | undefined } {
  const { orgId } = useCurrentOrg()
  const { capabilities } = useCapabilities()
  const { total: activeContacts, isLoading: contactsLoading } = useContacts(orgId, {
    page: 1,
    pageSize: 1,
    isActive: 'true',
  })
  const { members, isLoading: membersLoading } = useMembers(orgId)
  const { branches, isLoading: branchesLoading } = useBranches(orgId)

  const max = capabilities?.limits
  const usage = capabilities?.usage

  /**
   * De dónde sale el consumo de **cada** tope.
   *
   * Va tipado como `Record<keyof LimitMap, …>` a propósito: es lo que obliga a
   * decir de dónde viene el consumo de un tope nuevo en vez de dejarlo fuera en
   * silencio. Pasó con `whatsapp_messages_monthly` — el tope llegó al contrato y
   * a las tarjetas de plan, pero la lista de medidores se escribía aparte y
   * seguía teniendo cinco entradas, así que el cupo de cobranza no se veía en
   * ninguna parte.
   */
  const used: Record<keyof LimitMap, number | null> = {
    max_contacts: contactsLoading ? null : activeContacts,
    max_users: membersLoading ? null : members.length,
    max_branches: branchesLoading ? null : branches.length,
    ai_messages_monthly: usage?.ai_messages_monthly ?? null,
    voice_minutes_monthly: usage?.voice_minutes_monthly ?? null,
    whatsapp_messages_monthly: usage?.whatsapp_messages_monthly ?? null,
  }

  return {
    period: capabilities?.period,
    // Se recorre `LIMIT_KEYS`, que es la lista que ya usan las tarjetas de plan:
    // una segunda enumeración aquí es exactamente lo que se acaba de romper.
    limits: LIMIT_KEYS.map((key) => ({
      key,
      label: limitLabel(key),
      used: used[key],
      max: max ? max[key] : null,
      periodic: isPeriodicLimit(key),
    })),
  }
}
