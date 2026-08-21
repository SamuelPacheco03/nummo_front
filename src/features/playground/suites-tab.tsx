import { useState } from 'react'
import { History } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Loader } from '@/components/ui/loader'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatDateHuman } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { PlaygroundCase, PlaygroundCaseRun } from '@/api/generated/model'
import { usePlaygroundSuiteRuns, usePlaygroundSuites } from './hooks'
import { formatMs, formatTokens } from './metrics'
import { QuietButton } from './quiet-button'
import { TraceDrawer } from './trace-drawer'

/**
 * **Corridas**: cómo fue cada ejecución del conjunto, y qué caso falló en cuál.
 *
 * Es donde aterriza «correr los doce», y por eso la más nueva abre desplegada: quien acaba
 * de lanzar una corrida viene a ver **esa**, no la lista.
 */
export function SuitesTab({
  cases,
  openSuiteId,
}: {
  cases: PlaygroundCase[]
  /** La recién corrida, para abrirla sin que haya que buscarla. */
  openSuiteId: string | null
}) {
  const { suites, isPending, isError, error } = usePlaygroundSuites(20)
  const [open, setOpen] = useState<string | null>(openSuiteId)
  const [openTrace, setOpenTrace] = useState<string | null>(null)
  const current = open ?? openSuiteId

  if (isError) return <ErrorState error={error} fallback="No se pudieron cargar las corridas." />

  if (isPending) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
        <Loader size="sm" label="Cargando las corridas" />
        Cargando…
      </div>
    )
  }

  if (suites.length === 0) {
    return (
      <EmptyState
        Icon={History}
        title="Todavía no se ha corrido el conjunto"
        description="Cuando lo corras, aquí queda cada ejecución con lo que pasó caso por caso."
      />
    )
  }

  return (
    <>
      <ul className="divide-y overflow-hidden rounded-lg border">
        {suites.map((suite) => {
          const expanded = current === suite.suiteId
          const clean = suite.passed === suite.total
          return (
            <li key={suite.suiteId} className="bg-card">
              <button
                type="button"
                onClick={() => setOpen(expanded ? '' : suite.suiteId)}
                aria-expanded={expanded}
                className={cn(
                  'hover:bg-accent flex w-full items-center gap-3 px-3.5 py-3 text-left text-sm transition-colors',
                  'focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">
                    <span className="nums">{suite.passed}</span> de{' '}
                    <span className="nums">{suite.total}</span> pasaron
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {formatDateHuman(suite.at)} · {suite.model}
                    {suite.systemOverridden ? ' · con otro prompt' : ''} ·{' '}
                    {formatMs(suite.latencyMsTotal)}
                  </span>
                </span>
                <StatusBadge
                  tone={clean ? 'success' : 'destructive'}
                  label={clean ? 'Todo bien' : `${suite.total - suite.passed} con fallo`}
                />
              </button>

              {expanded && <SuiteRuns suiteId={suite.suiteId} cases={cases} onTrace={setOpenTrace} />}
            </li>
          )
        })}
      </ul>

      {openTrace && <TraceDrawer traceId={openTrace} onClose={() => setOpenTrace(null)} />}
    </>
  )
}

function SuiteRuns({
  suiteId,
  cases,
  onTrace,
}: {
  suiteId: string
  cases: PlaygroundCase[]
  onTrace: (traceId: string) => void
}) {
  const { runs, isPending, isError, error } = usePlaygroundSuiteRuns(suiteId)

  if (isPending) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 px-3.5 pb-3 text-xs">
        <Loader size="sm" label="Cargando el detalle" />
        Cargando el detalle…
      </div>
    )
  }

  if (isError) {
    return (
      <div className="px-3.5 pb-3">
        <ErrorState error={error} fallback="No se pudo cargar el detalle de la corrida." />
      </div>
    )
  }

  return (
    <ul className="space-y-2 border-t px-3.5 py-3">
      {runs.map((run) => (
        <CaseRunRow
          key={run.id}
          run={run}
          label={cases.find((c) => c.id === run.caseId)?.label ?? run.caseId}
          onTrace={() => run.traceId && onTrace(run.traceId)}
        />
      ))}
    </ul>
  )
}

/** Una línea por caso corrido: pasó o no, y **por qué** no. */
export function CaseRunRow({
  run,
  label,
  onTrace,
}: {
  run: PlaygroundCaseRun
  label: string
  onTrace: () => void
}) {
  return (
    <li className="bg-background space-y-1.5 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge
          tone={run.passed ? 'success' : 'destructive'}
          label={run.passed ? 'Pasó' : 'Falló'}
        />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{label}</span>
        <span className="nums text-muted-foreground text-xs">
          {formatMs(run.latencyMs)} · {formatTokens(run.inputTokens)} /{' '}
          {formatTokens(run.outputTokens)}
        </span>
      </div>

      {run.failures.length > 0 && (
        /* Las escribió el backend para leerse; se enseñan tal cual. */
        <ul className="text-destructive space-y-0.5 text-xs">
          {run.failures.map((failure, index) => (
            <li key={index}>{failure}</li>
          ))}
        </ul>
      )}

      {run.traceId && <QuietButton onClick={onTrace}>Ver la traza</QuietButton>}
    </li>
  )
}
