import { useCallback, useMemo } from 'react'
import type { CapabilitiesDtoPermissionsItem, OrganizationStatus } from '@/api/generated/model'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { useCapabilities } from './hooks'

/**
 * Un permiso del backend, tal como lo publica el contrato.
 *
 * No se escribe a mano: el enum sale de `openapi.json`, así que un permiso que
 * el backend renombre rompe `tsc` en vez de dejar un botón gateado contra una
 * cadena muerta que nadie vuelve a mirar.
 */
export type Permission = CapabilitiesDtoPermissionsItem

/**
 * Una organización que no está `ACTIVE` queda en **solo lectura**: consultar y
 * exportar siguen funcionando —eso no se gatea nunca— y cualquier mutación
 * responde `403 ORGANIZATION_SUSPENDED`.
 *
 * Se lee del estado de la organización y no del error, para poder deshabilitar
 * **antes** del intento: es un modo de la aplicación entera, no el fallo de una
 * pantalla, y avisar con un toast por cada clic sería contarlo veinte veces.
 * Solo la plataforma puede revertirlo.
 *
 * Mientras la organización carga no hay modo que declarar: `false`.
 */
export function useOrgReadOnly(): { isReadOnly: boolean; status: OrganizationStatus | undefined } {
  const { organization } = useCurrentOrg()
  return {
    isReadOnly: organization != null && organization.status !== 'ACTIVE',
    status: organization?.status,
  }
}

/**
 * Los permisos de lectura terminan en `.read`; los demás escriben.
 *
 * Es la convención del propio catálogo del backend, no una lista nuestra que
 * mantener: `requireTenant` bloquea todo lo que no sea un GET cuando la
 * organización no está activa, y eso es exactamente este conjunto —`assistant.use`
 * incluido, que es un POST aunque no se llame `.write`—.
 */
function isReadPermission(permission: Permission): boolean {
  return permission.endsWith('.read')
}

/**
 * ¿Se puede ofrecer esta acción?
 *
 * El backend dejó de autorizar por nombre de rol: cada operación del contrato
 * viene anotada con `x-required-permission` y `/me/capabilities` dice cuáles
 * tiene quien mira. Un `if (role === 'ADMIN')` en el front sería una segunda
 * tabla de reglas, y se desincronizaría el día que existan roles personalizados
 * —que es justo lo que el backend dejó preparado—.
 *
 * **Esto no es autorización** (§88.5). Sirve para no ofrecer lo que va a fallar;
 * el backend lo revalida todo, y ocultar un botón no protege nada.
 *
 * Mientras las capacidades cargan devuelve `false`, que es el lado seguro: una
 * acción que aparece un instante después no rompe nada; una que se ofrece y
 * responde 403, sí.
 *
 * @example
 * const can = useCan()
 * const canManage = can('organization.manage')
 */
export function useCan(): (permission: Permission) => boolean {
  const { capabilities } = useCapabilities()
  const { isReadOnly } = useOrgReadOnly()
  const granted = useMemo(() => new Set(capabilities?.permissions), [capabilities?.permissions])

  return useCallback(
    (permission: Permission) => {
      if (!granted.has(permission)) return false
      // Suspendida: se sigue mirando todo, no se toca nada.
      return isReadPermission(permission) || !isReadOnly
    },
    [granted, isReadOnly],
  )
}
