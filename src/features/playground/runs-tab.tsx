import { useState } from 'react'
import { History } from 'lucide-react'
import { Pagination } from '@/components/pagination'
import { DataList, RowChevron } from '@/components/ui/data-list'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { listColumns } from '@/components/ui/list-columns'
import { formatConversationStamp } from '@/features/assistant/utils'
import type {
  GetApiV1AdminPlaygroundRunsParams,
  PlaygroundTraceSummary,
} from '@/api/generated/model'
import { usePlaygroundRuns } from './hooks'
import { kindLabel, originLabel, runStatus } from './labels'
import { formatCost, formatMs, formatTokens, totalTokens, SIN_DATO } from './metrics'
import { TraceDrawer } from './trace-drawer'

/** Diez, como el resto de listados. */
const PAGE_SIZE = 10

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
/**
 * **Turnos**: todos los archivados, uno a uno, con lo que costó cada uno.
 *
 * Es la otra escala del mismo panel. «Resumen» dice **cuánto** pasó por día; esto dice
 * **qué** pasó — que es lo que hace falta cuando el pico de p95 de un martes tiene nombre
 * y apellido. Los criterios los pone la pestaña de arriba, que son los mismos.
 */
export function RunsTab({
  origin,
  kind,
  organizationId,
  page,
  onPage,
}: {
  origin: 'user' | 'playground' | undefined
  kind: GetApiV1AdminPlaygroundRunsParams['kind']
  organizationId: string
  page: number
  onPage: (page: number) => void
}) {
  const [openTrace, setOpenTrace] = useState<string | null>(null)

  const params: GetApiV1AdminPlaygroundRunsParams = {
    page,
    pageSize: PAGE_SIZE,
    organizationId: organizationId || undefined,
    origin,
    kind,
  }
  const { runs, total, totalPages, isPending, isError, error } = usePlaygroundRuns(params)

  if (isError) return <ErrorState error={error} fallback="No se pudo cargar el historial." />

  return (
    <div className="space-y-4">
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
        onPage={onPage}
      />

      {openTrace && <TraceDrawer traceId={openTrace} onClose={() => setOpenTrace(null)} />}
    </div>
  )
}
