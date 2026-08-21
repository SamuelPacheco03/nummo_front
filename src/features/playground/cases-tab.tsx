import { ListChecks, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataList } from '@/components/ui/data-list'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { listColumns } from '@/components/ui/list-columns'
import { roleLabel } from '@/features/organizations/roles'
import { formatDateHuman } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { PlaygroundCase, PlaygroundCaseRun } from '@/api/generated/model'
import { countExpectations } from './expectations'

const column = listColumns<PlaygroundCase>()

/**
 * Las columnas del conjunto.
 *
 * **El endpoint no acepta orden**, así que la lista no ofrece cabeceras que ordenen:
 * reordenar solo lo cargado daría un orden global falso (§18.1).
 *
 * «Estado» sale de la **última corrida**, no del caso: un caso no tiene estado propio —lo
 * tiene su última ejecución— y por eso la columna se queda vacía para los que todavía no
 * se han corrido nunca, en vez de inventarles un «pasó».
 */
function buildColumns(lastRuns: Map<string, PlaygroundCaseRun>) {
  return column.columns([
    column.display({
      id: 'label',
      header: 'Caso',
      meta: { card: 'title' },
      cell: ({ row }) => (
        <span className="min-w-0">
          <span className="block truncate font-medium">{row.original.label}</span>
          <span className="text-muted-foreground block truncate text-xs">
            {roleLabel(row.original.role)}
          </span>
        </span>
      ),
    }),
    column.display({
      id: 'message',
      header: 'Pregunta',
      meta: { card: 'meta' },
      cell: ({ row }) => (
        <span className="text-muted-foreground line-clamp-1">{row.original.message}</span>
      ),
    }),
    column.display({
      id: 'status',
      header: 'Última corrida',
      meta: { card: 'status' },
      cell: ({ row }) => {
        const run = lastRuns.get(row.original.id)
        if (!run) return <span className="text-muted-foreground text-xs">Sin correr</span>
        return (
          <StatusBadge
            tone={run.passed ? 'success' : 'destructive'}
            label={run.passed ? 'Pasó' : 'Falló'}
          />
        )
      },
    }),
    column.display({
      id: 'expectations',
      header: 'Expectativas',
      meta: { align: 'right', card: 'amount' },
      cell: ({ row }) => <span className="nums">{countExpectations(row.original)}</span>,
    }),
    column.display({
      id: 'createdAt',
      header: 'Creado',
      meta: { hideOnStack: true },
      cell: ({ row }) => (
        <span className="text-muted-foreground">{formatDateHuman(row.original.createdAt)}</span>
      ),
    }),
  ])
}

/**
 * **Casos**: qué está protegido y cómo salió la última vez.
 *
 * Las tres cifras de arriba son las que deciden si hay trabajo: cuántos casos hay, cómo
 * fue la última corrida y —la que importa— **cuáles pasaban ayer y hoy fallan**. Esa
 * tercera no la da el contrato: sale de comparar las corridas de las dos últimas suites,
 * que es una resta sobre datos reales, no una estimación.
 */
export function CasesTab({
  cases,
  isPending,
  isError,
  error,
  lastRuns,
  organizationId,
  onEdit,
  onRun,
  running,
}: {
  cases: PlaygroundCase[]
  isPending: boolean
  isError: boolean
  error: unknown
  lastRuns: Map<string, PlaygroundCaseRun>
  organizationId: string
  onEdit: (item: PlaygroundCase) => void
  onRun: (caseIds?: string[]) => void
  running: boolean
}) {
  if (isError) return <ErrorState error={error} fallback="No se pudieron cargar los casos." />

  return (
    <DataList
      columns={buildColumns(lastRuns)}
      rows={cases}
      getRowId={(item) => item.id}
      onRowClick={onEdit}
      isLoading={isPending}
      skeletonRows={5}
      emptyText={
        <EmptyState
          Icon={ListChecks}
          title="Todavía no hay casos"
          description={
            organizationId
              ? 'Guarda el primero desde la traza de una corrida que salió mal, o créalo aquí.'
              : 'Elige una organización para crear el primero.'
          }
          action={
            cases.length === 0 && !isPending ? undefined : (
              <Button size="sm" onClick={() => onRun()} disabled={running}>
                <Play aria-hidden />
                Correr
              </Button>
            )
          }
        />
      }
      className={cn(running && 'opacity-60')}
    />
  )
}
