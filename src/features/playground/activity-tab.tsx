import { Activity } from 'lucide-react'
import { Panel } from '@/components/panel'
import { Chart } from '@/components/ui/chart'
import { DataList } from '@/components/ui/data-list'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { listColumns } from '@/components/ui/list-columns'
import { cn } from '@/lib/utils'
import type {
  GetApiV1AdminPlaygroundStatsParams,
  PlaygroundStatsToolsItem,
} from '@/api/generated/model'
import { usePlaygroundStats } from './hooks'
import { formatMs, formatTokens, SIN_DATO_LARGO } from './metrics'
import { delta, previousRange } from './ranges'

const column = listColumns<PlaygroundStatsToolsItem>()

/** El endpoint no acepta orden, así que la tabla no ofrece cabeceras que ordenen (§18.1). */
const toolColumns = column.columns([
  column.display({
    id: 'name',
    header: 'Herramienta',
    meta: { card: 'title' },
    cell: ({ row }) => <span className="truncate font-mono text-xs">{row.original.name}</span>,
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
      <span className={cn('nums', row.original.failures > 0 && 'text-destructive')}>
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
 * **Resumen**: cuánto se usa Numi, cuánto tarda y en qué se va.
 *
 * La comparación con el período anterior sale de **una segunda llamada a la misma ruta**,
 * con la ventana inmediatamente anterior del mismo tamaño. El contrato mide una ventana y
 * solo una, así que «+18 % respecto al mes pasado» o se pide o se inventa — y aquí no se
 * inventa nada (§70).
 */
export function ActivityTab({ params }: { params: GetApiV1AdminPlaygroundStatsParams }) {
  const { stats, isPending, isError, error, refetch } = usePlaygroundStats(params)
  const before = previousRange(params.from, params.to)
  const previous = usePlaygroundStats({ ...params, from: before.from, to: before.to })

  // Un fallo no se pinta con ceros (§45.2b): sin dato anterior, la pantalla es el error.
  if (isError && !stats) {
    return (
      <ErrorState
        error={error}
        fallback="No se pudo cargar la actividad."
        onRetry={() => void refetch()}
      />
    )
  }

  if (isPending && !stats) {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!stats || stats.totals.turns === 0) {
    return (
      <EmptyState
        Icon={Activity}
        title="Sin turnos en esta ventana"
        description={
          params.origin === 'user'
            ? 'Nadie le habló a Numi en esas fechas. Prueba a ampliar la ventana, o a incluir las pruebas de esta consola en el origen.'
            : 'Nadie le habló a Numi en esas fechas. Prueba a ampliar la ventana o a quitar el filtro de organización.'
        }
      />
    )
  }

  const totals = stats.totals
  const prev = previous.stats?.totals
  const tokens = totals.inputTokens + totals.outputTokens

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Turnos"
          value={totals.turns.toLocaleString('es-CO')}
          change={delta(totals.turns, prev?.turns)}
          higherIsGood
        />
        <Kpi
          label="Tokens"
          value={formatTokens(tokens)}
          sub={`${formatTokens(totals.inputTokens)} de entrada`}
          change={delta(tokens, prev ? prev.inputTokens + prev.outputTokens : undefined)}
        />
        <Kpi
          label="Acierto de caché"
          value={`${Math.round(totals.cacheHitRate * 100)} %`}
          sub={`${formatTokens(totals.cacheReadTokens)} leídos`}
          change={delta(totals.cacheHitRate, prev?.cacheHitRate)}
          higherIsGood
        />
        <Kpi
          label="Cifras sin respaldo"
          value={totals.groundingViolations.toLocaleString('es-CO')}
          sub={`${totals.failures} turnos con fallo`}
          change={delta(totals.groundingViolations, prev?.groundingViolations)}
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <Panel title="Turnos por día">
          <Chart
            data={stats.days}
            x="day"
            unit="count"
            height={220}
            series={[
              { key: 'turns', label: 'Turnos', tone: 'chart-1' },
              { key: 'failures', label: 'Con fallo', tone: 'destructive' },
            ]}
          />
        </Panel>

        <Panel title="Latencia por día">
          <Chart
            data={stats.days}
            x="day"
            unit="count"
            height={220}
            series={[
              { key: 'p50Ms', label: 'Mediana (ms)', tone: 'chart-2', shape: 'line' },
              { key: 'p95Ms', label: 'p95 (ms)', tone: 'chart-4', shape: 'line' },
            ]}
          />
        </Panel>
      </div>

      <Panel title="En qué se van las herramientas">
        <DataList
          columns={toolColumns}
          rows={stats.tools}
          getRowId={(tool) => tool.name}
          isLoading={false}
          emptyText="Ninguna herramienta se llamó en esta ventana."
        />
      </Panel>
    </div>
  )
}

/**
 * Una cifra de cabecera con su cambio.
 *
 * El cambio solo aparece si hay período anterior con qué compararlo; si no, la cifra va
 * sola. Un «0 %» donde no se sabe es la misma mentira que un cero donde no hay dato.
 */
function Kpi({
  label,
  value,
  sub,
  change,
  higherIsGood = false,
}: {
  label: string
  value: string
  sub?: string
  change: number | null
  higherIsGood?: boolean
}) {
  const good = change !== null && (higherIsGood ? change >= 0 : change <= 0)

  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="nums font-display mt-1 text-2xl font-semibold tracking-tight">{value}</div>
      <div className="text-muted-foreground mt-1 flex flex-wrap items-baseline gap-x-2 text-xs">
        {change !== null ? (
          <>
            <span className={cn('font-medium', good ? 'text-success-strong' : 'text-destructive')}>
              {change > 0 ? '+' : ''}
              {(change * 100).toFixed(1).replace('.', ',')} %
            </span>
            <span>vs. período anterior</span>
          </>
        ) : (
          <span>{sub ?? SIN_DATO_LARGO}</span>
        )}
      </div>
      {change !== null && sub && <div className="text-muted-foreground mt-0.5 text-xs">{sub}</div>}
    </div>
  )
}
