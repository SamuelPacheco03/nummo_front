import {
  useGetApiV1MePlatformAccess,
  useGetApiV1OrganizationsOrgIdMeCapabilities,
  useGetApiV1Plans,
} from '@/api/generated/endpoints/platform/platform'
import type { CapabilitiesDto, PlatformAccess, PublicPlan } from '@/api/generated/model'
import { useBranches, useMembers } from '@/features/config/hooks'
import { useContacts } from '@/features/contacts/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { asArray } from '@/lib/list-result'
import { isPeriodicLimit, limitLabel } from './labels'

/**
 * Lo que este usuario puede hacer y lo que incluye el plan de su organización,
 * en **una sola llamada** al entrar: rol, permisos, plan, features, topes,
 * período y consumo.
 *
 * Se llama desde muchos sitios a propósito —cada pantalla pregunta por su
 * permiso— y sigue siendo una sola petición: TanStack Query comparte la entrada
 * de caché por clave, así que veinte llamadores no son veinte peticiones.
 *
 * `staleTime` alto porque esto cambia cuando cambia el plan o el rol, no
 * mientras se trabaja; el 401 y el cambio de organización lo invalidan solos
 * (la clave lleva el `orgId`).
 */
export function useCapabilities() {
  const { orgId } = useCurrentOrg()
  const query = useGetApiV1OrganizationsOrgIdMeCapabilities(orgId ?? '', {
    query: { enabled: !!orgId, staleTime: 5 * 60_000 },
  })

  return {
    capabilities: query.data?.data as CapabilitiesDto | undefined,
    // `isLoading` y no `isPending`: sin organización la consulta está apagada y
    // `isPending` se quedaría en true para siempre.
    isLoading: query.isLoading,
    isError: query.isError,
  }
}

/**
 * **El catálogo de planes en venta**, en el orden en que se presentan.
 *
 * No es tenant-scoped y pide sesión: la app vive detrás del login y los precios
 * no se publican a quien encuentre la URL. Devuelve solo los públicos y no
 * archivados —Empresa existe pero no está a la venta—, cada uno con el catálogo
 * completo de features y topes resueltos: lo que anuncia la tabla es exactamente
 * lo que aplican los guards.
 */
export function usePlans() {
  const query = useGetApiV1Plans({ query: { staleTime: 60 * 60_000 } })
  return {
    plans: asArray<PublicPlan>(query.data?.data),
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}

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

  const row = (key: keyof NonNullable<typeof max>, used: number | null): LimitUsage => ({
    key,
    label: limitLabel(key),
    used,
    max: max ? max[key] : null,
    periodic: isPeriodicLimit(key),
  })

  return {
    period: capabilities?.period,
    limits: [
      row('max_contacts', contactsLoading ? null : activeContacts),
      row('max_users', membersLoading ? null : members.length),
      row('max_branches', branchesLoading ? null : branches.length),
      row('ai_messages_monthly', usage?.ai_messages_monthly ?? null),
      row('voice_minutes_monthly', usage?.voice_minutes_monthly ?? null),
    ],
  }
}

/**
 * ¿Esta cuenta administra la plataforma?
 *
 * Endpoint propio y no un campo de `/auth/me`, para no hacer que `auth` —el
 * módulo del que dependen todos— dependa de `platform`. Va **en paralelo** con
 * la sesión, no después.
 *
 * Es **orientativo, no autorización**: sirve para no ofrecer un menú que va a
 * fallar. Cada petición a `/admin/*` lo vuelve a comprobar contra la tabla, así
 * que un cliente que se mienta a sí mismo solo consigue un 403. Y ningún rol de
 * organización da acceso: ser OWNER de la tuya no te hace superadmin.
 */
export function usePlatformAccess() {
  const query = useGetApiV1MePlatformAccess({
    query: { staleTime: 5 * 60_000, retry: false },
  })
  const access = query.data?.data as PlatformAccess | undefined
  return { isPlatformAdmin: access?.isPlatformAdmin === true, isLoading: query.isLoading }
}
