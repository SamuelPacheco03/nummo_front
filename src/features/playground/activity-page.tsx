import { Activity } from 'lucide-react'
import { KpiStrip, KpiTile } from '@/components/kpi-tile'
import { Panel } from '@/components/panel'
import { PageHeader } from '@/components/page-header'
import { Chart } from '@/components/ui/chart'
import { DataList } from '@/components/ui/data-list'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Skeleton } from '@/components/ui/skeleton'
import { listColumns } from '@/components/ui/list-columns'
import { todayISODate } from '@/lib/format'
import { useListFilters } from '@/lib/use-list-filters'
import type { GetApiV1AdminPlaygroundStatsParams, PlaygroundStatsToolsItem } from '@/api/generated/model'
import { usePlaygroundOrganizations, usePlaygroundStats } from './hooks'
import { formatMs, formatTokens } from './metrics'
import { OrganizationPicker } from './organization-picker'
import { useRunSettings } from './run-settings'

const FILTER_KEYS = ['desde', 'hasta', 'origen'] as const
type FilterKey = (typeof FILTER_KEYS)[number]

/** Treinta días es la ventana en la que se nota un cambio de prompt sin ahogar la gráfica. */
function defaultRange(): { from: string; to: string } {
  const to = todayISODate()
  const from = new Date(Date.now() - 29 * 86_400_000).toISOString().slice(0, 10)
  return { from, to }
}

const ORIGINS = [
  { value: 'user', label: 'Clientes' },
  { value: 'playground', label: 'Pruebas' },
  { value: '', label: 'Todo' },
] as const

const column = listColumns<PlaygroundStatsToolsItem>()

const toolColumns = column.columns([
  column.display({
    id: 'name',
    header: 'Herramienta',
    meta: { card: 'title' },
    cell: ({ row }) => <span className="truncate font-medium">{row.original.name}</span>,
  }),
  column.display({
    id: 'calls',
    header: 'Llamadas',
    meta: { align: 'right', card: 'amount' },
    cell: ({ row }) => <span className="nums">{row.original.calls.toLocaleString('es-CO')}</span>,
  }),
  column.display({
    id: 'failures',
    header: 'Fallos',
    meta: { align: 'right', label: 'Fallos' },
    cell: ({ row }) => (
      <span className={row.original.failures > 0 ? 'nums text-destructive' : 'nums'}>
        {row.original.failures}
      </span>
    ),
  }),
  column.display({
    id: 'avgMs',
    header: 'Media',
    meta: { align: 'right', label: 'Duración media' },
    cell: ({ row }) => <span className="nums">{formatMs(row.original.avgMs)}</span>,
  }),
])

/**
 * **Qué está haciendo Numi**: turnos por día, latencia, tokens y en qué se van.
 *
 * El filtro que importa es `origin`. Por defecto vienen mezclados los turnos de clientes
 * y las pruebas de esta consola, y casi siempre se quiere lo primero: contar las pruebas
 * como uso real infla justo la cifra por la que alguien mira este panel.
 */
export function PlaygroundActivityPage() {
  const { values, set } = useListFilters<FilterKey>('nummo:playground:actividad', FILTER_KEYS)
  const { settings, selectOrganization, set: setRun } = useRunSettings()
  const range = defaultRange()
  const from = values.desde || range.from
  const to = values.hasta || range.to
  // `origen` vacío en la URL significa «no puesto», así que el valor por defecto se
  // escribe aquí y «Todo» viaja como una marca propia.
  const origin = values.origen === 'todo' ? undefined : ((values.origen || 'user') as 'user' | 'playground')

  const params: GetApiV1AdminPlaygroundStatsParams = {
    from,
    to,
    organizationId: settings.orgId || undefined,
    origin,
  }
  const { stats, isPending, isError, error, refetch } = usePlaygroundStats(params)

  // La organización elegida se describe con la lista, que es lo que ya se consulta aquí.
  const { organizations } = usePlaygroundOrganizations({ page: 1, pageSize: 50 })
  const organization = organizations.find((org) => org.id === settings.orgId)

  const days = stats?.days ?? []

  return (
    <div className="space-y-5">
      <PageHeader
        title="Actividad"
        description="Turnos, latencia y tokens por día, y en qué herramientas se van."
      />

      <Panel title="Ventana">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Desde" htmlFor="pg-desde">
              <Input
                id="pg-desde"
                type="date"
                value={from}
                max={to}
                onChange={(e) => set({ desde: e.target.value })}
              />
            </Field>
            <Field label="Hasta" htmlFor="pg-hasta">
              <Input
                id="pg-hasta"
                type="date"
                value={to}
                min={from}
                onChange={(e) => set({ hasta: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Origen" hint="Las pruebas de esta consola no son uso de clientes.">
            <SegmentedControl
              aria-label="Origen de los turnos"
              options={ORIGINS.map((o) => ({ value: o.value || 'todo', label: o.label }))}
              value={values.origen || 'user'}
              onChange={(origen) => set({ origen })}
            />
          </Field>

          <Field label="Organización" hint="Vacío son todas.">
            <div className="space-y-2">
              <OrganizationPicker organization={organization} onSelect={selectOrganization} />
              {settings.orgId && (
                <button
                  type="button"
                  onClick={() => setRun({ org: '' })}
                  className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 rounded text-xs underline-offset-4 transition-colors hover:underline focus-visible:ring-[3px] focus-visible:outline-none"
                >
                  Ver todas las organizaciones
                </button>
              )}
            </div>
          </Field>
        </div>
      </Panel>

      {/* Un fallo no se pinta con ceros (§45.2b): sin datos previos, la pantalla es el error. */}
      {isError && !stats ? (
        <ErrorState
          error={error}
          fallback="No se pudo cargar la actividad."
          onRetry={() => void refetch()}
        />
      ) : isPending && !stats ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !stats || stats.totals.turns === 0 ? (
        <EmptyState
          Icon={Activity}
          title="Sin turnos en esta ventana"
          description="Nadie le habló a Numi en esas fechas con ese origen."
        />
      ) : (
        <>
          <KpiStrip
            featured={
              <KpiTile
                featured
                label="Turnos"
                value={stats.totals.turns.toLocaleString('es-CO')}
                sub={`${stats.totals.failures} con fallo`}
              />
            }
          >
            <KpiTile
              label="Tokens"
              value={formatTokens(stats.totals.inputTokens + stats.totals.outputTokens)}
              sub={`${formatTokens(stats.totals.inputTokens)} de entrada`}
            />
            <KpiTile
              label="Caché"
              value={`${Math.round(stats.totals.cacheHitRate * 100)} %`}
              sub={`${formatTokens(stats.totals.cacheReadTokens)} leídos`}
            />
            <KpiTile
              label="Cifras sin respaldo"
              value={stats.totals.groundingViolations.toLocaleString('es-CO')}
              sub="grounding"
            />
          </KpiStrip>

          <Panel title="Turnos por día">
            <Chart
              data={days}
              x="day"
              unit="count"
              series={[
                { key: 'turns', label: 'Turnos', tone: 'chart-1' },
                { key: 'failures', label: 'Con fallo', tone: 'destructive' },
              ]}
            />
          </Panel>

          <Panel title="Latencia por día">
            <Chart
              data={days}
              x="day"
              unit="count"
              height={220}
              series={[
                { key: 'p50Ms', label: 'Mediana (ms)', tone: 'chart-2', shape: 'line' },
                { key: 'p95Ms', label: 'p95 (ms)', tone: 'chart-4', shape: 'line' },
              ]}
            />
          </Panel>

          <Panel title="Tokens por día">
            <Chart
              data={days}
              x="day"
              unit="count"
              height={220}
              series={[
                { key: 'inputTokens', label: 'Entrada', tone: 'chart-1', stack: 'tokens' },
                { key: 'outputTokens', label: 'Salida', tone: 'chart-3', stack: 'tokens' },
                { key: 'cacheReadTokens', label: 'De caché', tone: 'chart-5', stack: 'tokens' },
              ]}
            />
          </Panel>

          <Panel title="Herramientas">
            <DataList
              columns={toolColumns}
              rows={stats.tools}
              getRowId={(tool) => tool.name}
              isLoading={false}
              emptyText="Ninguna herramienta se llamó en esta ventana."
            />
          </Panel>
        </>
      )}
    </div>
  )
}
