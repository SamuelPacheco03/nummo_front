import { DateRangeFields } from '@/components/date-range-fields'
import { PageHeader } from '@/components/page-header'
import { PlatformPage } from '@/features/admin/platform-page'
import { Field } from '@/components/ui/field'
import { NativeSelect } from '@/components/ui/native-select'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { useListFilters } from '@/lib/use-list-filters'
import type { GetApiV1AdminPlaygroundRunsParams } from '@/api/generated/model'
import { ActivityTab } from './activity-tab'
import { FeedbackTab } from './feedback-tab'
import { readOrigin } from './labels'
import { OrganizationFilter, OriginFilter } from './panel-filters'
import { defaultRange } from '@/lib/date-range'
import { RunsTab } from './runs-tab'
import { useRunSettings } from './run-settings'

/**
 * **Vigilar**: qué está haciendo Numi con clientes de verdad.
 *
 * Eran tres destinos del menú —Actividad, Historial y Puntuaciones— y son **la misma
 * pregunta a tres escalas**: cuánto pasó, qué pasó turno por turno, y qué le pareció a
 * quien lo leyó. Separarlos obligaba a saber de antemano en cuál de los tres estaba la
 * respuesta, que es justo lo que uno no sabe cuando viene a mirar.
 *
 * **Los filtros son de cada pestaña, no de la pantalla.** El resumen mide una ventana de
 * fechas —el contrato la exige—, el historial no acepta fechas pero sí clase de llamada, y
 * las puntuaciones no aceptan ninguna de las dos. Una barra común con controles que no
 * hacen nada en la mitad de las vistas enseñaría filtros que mienten.
 */

const KEYS = ['vista', 'desde', 'hasta', 'origen', 'clase', 'pagina', 'voto'] as const
type Key = (typeof KEYS)[number]

type Tab = 'resumen' | 'turnos' | 'puntuaciones'

const TABS: { value: Tab; label: string }[] = [
  { value: 'resumen', label: 'Resumen' },
  { value: 'turnos', label: 'Turnos' },
  { value: 'puntuaciones', label: 'Puntuaciones' },
]

const KINDS = [
  { value: '', label: 'Todas' },
  { value: 'turn', label: 'Turnos' },
  { value: 'title', label: 'Títulos' },
  { value: 'summary', label: 'Resúmenes' },
]

export function PlaygroundVigilarPage() {
  const { values, set } = useListFilters<Key>('nummo:playground:vigilar', KEYS)
  const { settings, selectOrganization, set: setRun } = useRunSettings()

  const tab = (TABS.find((t) => t.value === values.vista)?.value ?? 'resumen') as Tab
  const range = defaultRange()
  const from = values.desde || range.from
  const to = values.hasta || range.to
  const feedback = values.voto === 'up' ? 'up' : 'down'

  return (
    <PlatformPage>
        <PageHeader
          title="Vigilar"
          description="Lo que pasó con clientes de verdad: cuánto se usa Numi, qué contestó turno por turno y qué le pareció a quien lo leyó."
        />

        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            aria-label="Qué se mira"
            options={TABS}
            value={tab}
            onChange={(vista) => set({ vista, pagina: '' })}
          />
        </div>

        {/* Cada pestaña enseña los filtros que su endpoint acepta, y ni uno más. */}
        {tab === 'resumen' && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <DateRangeFields
              idPrefix="pg"
              from={from}
              to={to}
              onChange={(r) => set({ ...(r.from && { desde: r.from }), ...(r.to && { hasta: r.to }) })}
            />
            <OriginFilter value={values.origen} onChange={(origen) => set({ origen })} />
            <OrganizationFilter
              organizationId={settings.orgId}
              onSelect={selectOrganization}
              onClear={() => setRun({ org: '' })}
            />
          </div>
        )}

        {tab === 'turnos' && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <OriginFilter
              value={values.origen}
              onChange={(origen) => set({ origen, pagina: '' })}
            />
            <Field label="Clase de llamada" htmlFor="pg-clase">
              <NativeSelect
                id="pg-clase"
                value={values.clase}
                onChange={(e) => set({ clase: e.target.value, pagina: '' })}
              >
                {KINDS.map((kind) => (
                  <option key={kind.value} value={kind.value}>
                    {kind.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <OrganizationFilter
              organizationId={settings.orgId}
              onSelect={(org) => {
                selectOrganization(org)
                set({ pagina: '' })
              }}
              onClear={() => {
                setRun({ org: '' })
                set({ pagina: '' })
              }}
            />
          </div>
        )}

        {tab === 'puntuaciones' && (
          <Field label="Voto" hint="Los pulgares abajo son los que traen trabajo.">
            <SegmentedControl
              aria-label="Voto"
              options={[
                { value: 'down', label: 'Pulgares abajo' },
                { value: 'up', label: 'Pulgares arriba' },
              ]}
              value={feedback}
              onChange={(voto) => set({ voto })}
            />
          </Field>
        )}

        <div className="pb-2">
          {tab === 'resumen' && (
            <ActivityTab
              params={{
                from,
                to,
                organizationId: settings.orgId || undefined,
                origin: readOrigin(values.origen),
              }}
            />
          )}
          {tab === 'turnos' && (
            <RunsTab
              origin={readOrigin(values.origen)}
              kind={(values.clase || undefined) as GetApiV1AdminPlaygroundRunsParams['kind']}
              organizationId={settings.orgId}
              page={Number(values.pagina) || 1}
              onPage={(page) => set({ pagina: String(page) })}
            />
          )}
          {tab === 'puntuaciones' && <FeedbackTab feedback={feedback} />}
        </div>
    </PlatformPage>
  )
}
