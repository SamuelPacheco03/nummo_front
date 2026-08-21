import { Field } from '@/components/ui/field'
import { SegmentedControl } from '@/components/ui/segmented-control'
import type { PlaygroundOrganization } from '@/api/generated/model'
import { usePlaygroundContext } from './hooks'
import { TODO_ORIGIN } from './labels'
import { OrganizationPicker } from './organization-picker'
import { QuietButton } from './quiet-button'

/**
 * Los dos filtros que comparten los paneles de **lo que ya pasó** —actividad e
 * historial—, que se miran con la misma pregunta: de quién y de cuándo.
 */

export function OriginFilter({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Field label="Origen" hint="Las pruebas de esta consola no son uso de clientes.">
      <SegmentedControl
        aria-label="Origen de los turnos"
        options={[
          { value: 'user', label: 'Clientes' },
          { value: 'playground', label: 'Pruebas' },
          { value: TODO_ORIGIN, label: 'Todo' },
        ]}
        value={value || 'user'}
        onChange={onChange}
      />
    </Field>
  )
}

/**
 * Contra qué organización se mira el panel, o contra todas.
 *
 * Resuelve por su cuenta **cómo se llama la elegida**, y lo hace preguntando **por su id**
 * y no buscándola en la primera página del listado. Con diez mil organizaciones en la
 * plataforma, la elegida casi nunca está entre las cincuenta primeras: el botón decía
 * «elige una organización» teniendo una elegida, y el filtro mentía sobre su propio estado
 * mientras el panel de al lado sí estaba filtrado.
 *
 * `/context` la devuelve entera por id y es la misma consulta que ya hace la consola, así
 * que después de la primera vez sale de la caché.
 */
export function OrganizationFilter({
  organizationId,
  onSelect,
  onClear,
  clearLabel = 'Ver todas las organizaciones',
}: {
  organizationId: string
  onSelect: (organization: PlaygroundOrganization) => void
  onClear: () => void
  clearLabel?: string
}) {
  const { context } = usePlaygroundContext(organizationId)
  const organization = context?.organization

  return (
    <Field label="Organización" hint="Vacío son todas.">
      <div className="space-y-2">
        <OrganizationPicker organization={organization} onSelect={onSelect} />
        {organizationId && <QuietButton onClick={onClear}>{clearLabel}</QuietButton>}
      </div>
    </Field>
  )
}
