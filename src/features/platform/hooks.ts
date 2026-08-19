import {
  useGetApiV1MePlatformAccess,
  useGetApiV1OrganizationsOrgIdMeCapabilities,
  useGetApiV1Plans,
} from '@/api/generated/endpoints/platform/platform'
import type { CapabilitiesDto, PlatformAccess, PublicPlan } from '@/api/generated/model'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { asArray } from '@/lib/list-result'

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
  return {
    isPlatformAdmin: access?.isPlatformAdmin === true,
    isLoading: query.isLoading,
    /*
      «No se pudo preguntar» no es «te dijeron que no», y sin distinguirlos las
      dos se ven igual: un superadmin de verdad contra un backend que no publica
      el endpoint vería exactamente la misma pantalla que un usuario cualquiera,
      y no tendría cómo saber cuál de las dos cosas le pasa.
    */
    isError: query.isError,
    error: query.error,
  }
}
