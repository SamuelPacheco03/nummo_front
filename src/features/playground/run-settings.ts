import { useListFilters } from '@/lib/use-list-filters'
import type {
  PlaygroundChatInputMode,
  PlaygroundChatInputRole,
  PlaygroundOrganization,
} from '@/api/generated/model'
import { ASSIGNABLE_ROLES } from '@/features/organizations/roles'

/**
 * **Contra qué se prueba**: organización, rol suplantado, modo y —si se quiere— otro
 * modelo. Lo comparten la consola, el ejecutor de herramientas y la comparación, que
 * hacen tres cosas distintas con exactamente la misma pregunta de partida.
 *
 * Los criterios viven aquí y los campos en `run-settings-fields.tsx`: un archivo que
 * exporta un hook y un componente a la vez rompe el refresco en caliente, y el lint del
 * repositorio lo dice.
 */

const KEYS = ['org', 'rol', 'rolpropio', 'modo', 'proveedor', 'modelo'] as const

/** Los criterios que viajan en la URL, en español como las rutas (§87.5). */
export type SettingsKey = (typeof KEYS)[number]

/** Una sola llave de sesión para todo el playground: saltar de pantalla no reelige. */
const STORAGE_KEY = 'nummo:playground'

export interface RunSettings {
  orgId: string
  role: PlaygroundChatInputRole
  /** Un rol propio **reemplaza** los permisos del rol base; no se suma a ellos (§47.3). */
  customRoleId: string
  mode: PlaygroundChatInputMode
  provider: string
  model: string
}

const ROLES = ASSIGNABLE_ROLES as unknown as PlaygroundChatInputRole[]

/**
 * Los criterios de la corrida, en la URL como los de cualquier listado (§21.1).
 *
 * Ahí y no en un store: es lo que permite mandar «prueba esto contra esta organización
 * con este rol» por chat, y es de lo que vive el botón «volver a correrla» del panel de
 * pulgares abajo.
 */
export function useRunSettings(): {
  settings: RunSettings
  set: (patch: Partial<Record<SettingsKey, string>>) => void
  /** Elegir organización suelta lo que era de la anterior. */
  selectOrganization: (organization: PlaygroundOrganization) => void
} {
  const { values, set } = useListFilters<SettingsKey>(STORAGE_KEY, KEYS)

  const role = ROLES.includes(values.rol as PlaygroundChatInputRole)
    ? (values.rol as PlaygroundChatInputRole)
    : 'OWNER'

  return {
    settings: {
      orgId: values.org,
      role,
      customRoleId: values.rolpropio,
      mode: values.modo === 'read_write' ? 'read_write' : 'read_only',
      provider: values.proveedor,
      model: values.modelo,
    },
    set,
    selectOrganization: (organization) =>
      set({
        org: organization.id,
        // Un rol propio es de una organización: el de la anterior no significa nada aquí.
        rolpropio: '',
        // Y si esta no admite escribir, el modo se cae solo en vez de esperar al 403.
        modo: organization.writable ? values.modo : '',
      }),
  }
}

/**
 * El modelo que se manda con el turno, o nada.
 *
 * **Nunca una clave.** El backend resuelve la credencial del proveedor por su cuenta y
 * no acepta que se le pegue una: si falta, el error dice qué variable de entorno es.
 */
export function modelOverride(settings: RunSettings) {
  if (!settings.provider || !settings.model.trim()) return undefined
  return {
    provider: settings.provider as 'anthropic' | 'openai' | 'google' | 'deepseek',
    model: settings.model.trim(),
  }
}
