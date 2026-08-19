import { useGetApiV1OrganizationsOrgIdMeCapabilities } from '@/api/generated/endpoints/platform/platform'
import type { CapabilitiesDto } from '@/api/generated/model'
import { useCurrentOrg } from '@/features/organizations/hooks'

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
