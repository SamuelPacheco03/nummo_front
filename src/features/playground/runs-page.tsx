import { useState } from 'react'
import { History } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import { Panel } from '@/components/panel'
import { DataList, RowChevron } from '@/components/ui/data-list'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Field } from '@/components/ui/field'
import { NativeSelect } from '@/components/ui/native-select'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { StatusBadge } from '@/components/ui/status-badge'
import { listColumns } from '@/components/ui/list-columns'
import { formatConversationStamp } from '@/features/assistant/utils'
import { useListFilters } from '@/lib/use-list-filters'
import type {
  GetApiV1AdminPlaygroundRunsParams,
  PlaygroundTraceSummary,
} from '@/api/generated/model'
import { usePlaygroundOrganizations, usePlaygroundRuns } from './hooks'
import { kindLabel, originLabel, runStatus } from './labels'
import { formatCost, formatMs, formatTokens, totalTokens, SIN_DATO } from './metrics'
import { OrganizationPicker } from './organization-picker'
import { useRunSettings } from './run-settings'
import { TraceDrawer } from './trace-drawer'

/** Diez, como el resto de listados. */
const PAGE_SIZE = 10

const FILTER_KEYS = ['origen', 'clase', 'pagina'] as const
type FilterKey = (typeof FILTER_KEYS)[number]

const KINDS = [
  { value: '', label: 'Todas' },
  { value: 'turn', label: 'Turnos' },
  { value: 'title', label: 'Títulos' },
  { value: 'summary', label: 'Resúmenes' },
]

const column = listColumns<PlaygroundTraceSummary>()

/**
 * Las columnas del historial.
 *
 * **El endpoint no acepta `sort`**, así que la lista no ofrece cabeceras que ordenen: ya
 * viene de la más nueva a la más vieja y reordenar solo la página cargada daría un orden
 * global falso (§18.1).
 */
const columns = column.columns([
  column.display({
    id: 'model',
    header: 'Modelo',
    meta: { card: 'title' },
    cell: ({ row }) => <span className="truncate font-medium">{row.original.model}</span>,
  }),
  column.display({
    id: 'at',
    header: 'Cuándo',
    meta: { card: 'meta' },
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatConversationStamp(row.original.at)} · {kindLabel(row.original.kind)} ·{' '}
        {originLabel(row.original.origin)}
      </span>
    ),
  }),
  column.display({
    id: 'status',
    header: 'Cómo salió',
    meta: { card: 'status' },
    cell: ({ row }) => <StatusBadge {...runStatus(row.original)} />,
  }),
  column.display({
    id: 'tokens',
    header: 'Tokens',
    meta: { align: 'right', label: 'Tokens' },
    cell: ({ row }) => {
      // `null` no es cero: el proveedor no lo reportó (§47.5).
      const tokens = totalTokens(row.original.usage)
      return <span className="nums">{tokens === null ? SIN_DATO : formatTokens(tokens)}</span>
    },
  }),
  column.display({
    id: 'cost',
    header: 'Coste',
    meta: { align: 'right', card: 'amount' },
    cell: ({ row }) => (
      <span className="nums">
        {row.original.costMicroUsd === null ? (
          <span className="text-muted-foreground">{SIN_DATO}</span>
        ) : (
          formatCost(row.original.costMicroUsd)
        )}
      </span>
    ),
  }),
  column.display({
    id: 'totalMs',
    header: 'Tiempo',
    meta: { align: 'right', card: 'sub' },
    cell: ({ row }) => (
      <span className="nums text-muted-foreground">{formatMs(row.original.totalMs)}</span>
    ),
  }),
  column.display({
    id: 'tools',
    header: 'Herramientas',
    meta: { hideOnStack: true },
    cell: ({ row }) => (
      <span className="text-muted-foreground truncate">
        {row.original.toolNames.length > 0 ? row.original.toolNames.join(', ') : '—'}
      </span>
    ),
  }),
  column.display({
    id: 'chevron',
    header: '',
    meta: { hideOnStack: true },
    cell: () => <RowChevron />,
  }),
])

/**
 * **El historial de corridas**: todos los turnos archivados, los de clientes y los de
 * prueba, con lo que costó cada uno y su traza a un clic.
 *
 * Es la puerta de atrás de las otras pantallas. La actividad dice **cuánto** pasó por día;
 * esto dice **qué** pasó, turno por turno — que es lo que hace falta cuando el pico de p95
 * de un martes tiene nombre y apellido.
 */
export function PlaygroundRunsPage() {
  const { values, set } = useListFilters<FilterKey>('nummo:playground:historial', FILTER_KEYS)
  const { settings, selectOrganization, set: setRun } = useRunSettings()
  const [openTrace, setOpenTrace] = useState<string | null>(null)

  const page = Number(values.pagina) || 1
  const params: GetApiV1AdminPlaygroundRunsParams = {
    page,
    pageSize: PAGE_SIZE,
    organizationId: settings.orgId || undefined,
    origin: values.origen === 'todo' ? undefined : ((values.origen || 'user') as 'user' | 'playground'),
    kind: (values.clase || undefined) as GetApiV1AdminPlaygroundRunsParams['kind'],
  }
  const { runs, total, totalPages, isPending, isError, error } = usePlaygroundRuns(params)

  // La elegida se describe con la lista, que es lo que ya se consulta en el selector.
  const { organizations } = usePlaygroundOrganizations({ page: 1, pageSize: 50 })
  const organization = organizations.find((org) => org.id === settings.orgId)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Historial de corridas"
        description="Todos los turnos archivados, con lo que costó cada uno y su traza completa."
      />

      <Panel title="Qué se mira">
        <div className="space-y-4">
          <Field label="Origen" hint="Las pruebas de esta consola no son uso de clientes.">
            <SegmentedControl
              aria-label="Origen de los turnos"
              options={[
                { value: 'user', label: 'Clientes' },
                { value: 'playground', label: 'Pruebas' },
                { value: 'todo', label: 'Todo' },
              ]}
              value={values.origen || 'user'}
              onChange={(origen) => set({ origen, pagina: '' })}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
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

            <Field label="Organización" hint="Vacío son todas.">
              <div className="space-y-2">
                <OrganizationPicker
                  organization={organization}
                  onSelect={(org) => {
                    selectOrganization(org)
                    set({ pagina: '' })
                  }}
                />
                {settings.orgId && (
                  <button
                    type="button"
                    onClick={() => {
                      setRun({ org: '' })
                      set({ pagina: '' })
                    }}
                    className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 rounded text-xs underline-offset-4 transition-colors hover:underline focus-visible:ring-[3px] focus-visible:outline-none"
                  >
                    Ver todas las organizaciones
                  </button>
                )}
              </div>
            </Field>
          </div>
        </div>
      </Panel>

      {isError ? (
        <ErrorState error={error} fallback="No se pudo cargar el historial." />
      ) : (
        <>
          <DataList
            columns={columns}
            rows={runs}
            getRowId={(run) => run.id}
            onRowClick={(run) => setOpenTrace(run.id)}
            isLoading={isPending}
            skeletonRows={PAGE_SIZE}
            emptyText={
              <EmptyState
                Icon={History}
                title="Sin corridas"
                description="Nadie le habló a Numi con esos criterios."
              />
            }
          />

          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            totalPages={totalPages}
            onPage={(next) => set({ pagina: String(next) })}
          />
        </>
      )}

      {openTrace && <TraceDrawer traceId={openTrace} onClose={() => setOpenTrace(null)} />}
    </div>
  )
}