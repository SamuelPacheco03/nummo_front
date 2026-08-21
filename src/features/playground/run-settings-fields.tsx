import { Field } from '@/components/ui/field'
import { NativeSelect } from '@/components/ui/native-select'
import { Note } from '@/components/ui/note'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Input } from '@/components/ui/input'
import { ASSIGNABLE_ROLES, roleLabel } from '@/features/organizations/roles'
import type {
  PlaygroundChatInputRole,
  PlaygroundContext,
  PlaygroundOrganization,
} from '@/api/generated/model'
import { MODES, providerLabel } from './labels'
import { OrganizationPicker } from './organization-picker'
import type { RunSettings, SettingsKey } from './run-settings'

const ROLES = ASSIGNABLE_ROLES as unknown as PlaygroundChatInputRole[]

/** Los campos de «contra qué se prueba». Los criterios los guarda `useRunSettings`. */
export function RunSettingsFields({
  settings,
  context,
  isLoading,
  onChange,
  onSelectOrganization,
  /** El ejecutor de herramientas y la consola eligen modo; la comparación no puede. */
  showMode = true,
  /** Solo la consola manda un modelo suelto: en la comparación lo lleva cada variante. */
  showModel = true,
}: {
  settings: RunSettings
  context: PlaygroundContext | undefined
  isLoading: boolean
  onChange: (patch: Partial<Record<SettingsKey, string>>) => void
  onSelectOrganization: (organization: PlaygroundOrganization) => void
  showMode?: boolean
  showModel?: boolean
}) {
  const organization = context?.organization
  const customRoles = context?.customRoles ?? []
  const providers = context?.testableProviders ?? []
  const writable = organization?.writable ?? false
  const suggested = providers.find((p) => p.provider === settings.provider)?.suggestedModels ?? []

  return (
    <div className="space-y-4">
      <Field label="Organización">
        <OrganizationPicker
          organization={organization}
          isLoading={isLoading}
          onSelect={onSelectOrganization}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Rol a suplantar" htmlFor="pg-rol">
          <NativeSelect
            id="pg-rol"
            value={settings.role}
            onChange={(e) => onChange({ rol: e.target.value })}
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {roleLabel(role)}
              </option>
            ))}
          </NativeSelect>
        </Field>

        {customRoles.length > 0 && (
          <Field
            label="Rol propio"
            htmlFor="pg-rol-propio"
            hint="Reemplaza los permisos del rol base, no se suma a ellos."
          >
            <NativeSelect
              id="pg-rol-propio"
              value={settings.customRoleId}
              onChange={(e) => onChange({ rolpropio: e.target.value })}
            >
              <option value="">Ninguno</option>
              {customRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        )}
      </div>

      {showMode && (
        <Field label="Modo">
          {writable ? (
            <SegmentedControl
              aria-label="Modo de la corrida"
              options={MODES.map((m) => ({ value: m.value, label: m.label }))}
              value={settings.mode}
              onChange={(modo) => onChange({ modo })}
            />
          ) : (
            <p className="text-muted-foreground text-sm">
              Solo lectura. {organization ? 'Esta organización no está activa' : 'Elige una organización'}
              , así que escribir no está disponible.
            </p>
          )}
        </Field>
      )}

      {showMode && settings.mode === 'read_write' && (
        /*
          El interruptor tiene que ser evidente, no una casilla escondida: en este modo
          la corrida **escribe de verdad** en la contabilidad de un cliente.
        */
        <Note tone="warning" title="Esta corrida escribe en la organización del cliente">
          Los pagos, egresos y contactos que Numi registre aquí quedan registrados de
          verdad. No es una simulación, y no hay deshacer en bloque: cada movimiento se
          revierte por donde se revierte siempre.
        </Note>
      )}

      {showModel && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Proveedor"
            htmlFor="pg-proveedor"
            hint={
              providers.length === 0
                ? 'Sin proveedores probables: se corre con la credencial de la organización.'
                : undefined
            }
          >
            <NativeSelect
              id="pg-proveedor"
              value={settings.provider}
              disabled={providers.length === 0}
              onChange={(e) => onChange({ proveedor: e.target.value, modelo: '' })}
            >
              <option value="">El de la organización</option>
              {providers.map((p) => (
                <option key={p.provider} value={p.provider}>
                  {p.label || providerLabel(p.provider)}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field
            label="Modelo"
            htmlFor="pg-modelo"
            hint={settings.provider ? 'Identificador exacto del modelo.' : undefined}
          >
            <Input
              id="pg-modelo"
              list="pg-modelos"
              value={settings.model}
              disabled={!settings.provider}
              placeholder={suggested[0] ?? 'El activo'}
              onChange={(e) => onChange({ modelo: e.target.value })}
            />
            <datalist id="pg-modelos">
              {suggested.map((model) => (
                <option key={model} value={model} />
              ))}
            </datalist>
          </Field>
        </div>
      )}
    </div>
  )
}
