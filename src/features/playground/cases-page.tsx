import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ListChecks, Play, Plus } from 'lucide-react'
import { Panel } from '@/components/panel'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DataList } from '@/components/ui/data-list'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Field } from '@/components/ui/field'
import { Loader } from '@/components/ui/loader'
import { Note } from '@/components/ui/note'
import { StatusBadge } from '@/components/ui/status-badge'
import { Textarea } from '@/components/ui/textarea'
import { listColumns } from '@/components/ui/list-columns'
import { roleLabel } from '@/features/organizations/roles'
import { toastApiError } from '@/features/platform/errors'
import { getApiV1AdminPlaygroundCasesDraft } from '@/api/generated/endpoints/platform-playground/platform-playground'
import { formatDateHuman } from '@/lib/format'
import { getErrorMessage } from '@/lib/errors'
import { toast } from 'sonner'
import type {
  GetApiV1AdminPlaygroundCasesDraft200,
  PlaygroundCase,
  PlaygroundCaseRun,
  PlaygroundSuiteResult,
} from '@/api/generated/model'
import { CaseFormDrawer, type CaseDraft } from './case-form'
import {
  useArchiveCase,
  usePlaygroundCases,
  usePlaygroundContext,
  usePlaygroundSuiteRuns,
  usePlaygroundSuites,
  useRunSuite,
} from './hooks'
import { formatMs, formatTokens } from './metrics'
import { RunSettingsFields } from './run-settings-fields'
import { modelOverride, useRunSettings } from './run-settings'
import { QuietButton } from './quiet-button'
import { TraceDrawer } from './trace-drawer'

const column = listColumns<PlaygroundCase>()

/**
 * Las columnas del conjunto. **El endpoint no acepta orden**, así que la lista no ofrece
 * cabeceras que ordenen: reordenar solo lo cargado daría un orden global falso (§18.1).
 */
const columns = column.columns([
  column.display({
    id: 'label',
    header: 'Caso',
    meta: { card: 'title' },
    cell: ({ row }) => <span className="truncate font-medium">{row.original.label}</span>,
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
    id: 'role',
    header: 'Rol',
    meta: { label: 'Rol' },
    cell: ({ row }) => roleLabel(row.original.role),
  }),
  column.display({
    id: 'expectations',
    header: 'Expectativas',
    meta: { align: 'right', label: 'Expectativas' },
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

/** Cuántas condiciones tiene que cumplir la respuesta para dar el caso por bueno. */
function countExpectations(item: PlaygroundCase): number {
  const e = item.expectations
  return (
    e.expectedTools.length +
    e.forbiddenTools.length +
    e.mustMention.length +
    e.mustNotMention.length +
    (e.mustBeGrounded ? 1 : 0)
  )
}

/**
 * **El conjunto de regresión**: casos guardados con lo que se espera de ellos, y el botón
 * que los corre todos contra un prompt nuevo.
 *
 * Es lo que convierte el playground en instrumento: «¿este cambio de prompt rompió algo
 * que ayer funcionaba?» no se responde conversando.
 */
export function PlaygroundCasesPage() {
  const { settings, set, selectOrganization } = useRunSettings()
  const [params, setParams] = useSearchParams()
  const { context, isPending: contextPending } = usePlaygroundContext(settings.orgId)

  const { cases, isPending, isError, error } = usePlaygroundCases(settings.orgId || undefined)
  const suites = usePlaygroundSuites()
  const runSuite = useRunSuite()
  const archive = useArchiveCase()

  const [editing, setEditing] = useState<PlaygroundCase | null>(null)
  const [creating, setCreating] = useState<CaseDraft | null>(null)
  const [removing, setRemoving] = useState<PlaygroundCase | null>(null)
  const [system, setSystem] = useState('')
  const [result, setResult] = useState<PlaygroundSuiteResult | null>(null)
  const [openSuite, setOpenSuite] = useState<string | null>(null)
  const [openTrace, setOpenTrace] = useState<string | null>(null)
  const [draftError, setDraftError] = useState<string | null>(null)

  /*
    «Guardar como caso» desde la traza de una corrida: llega el id por la URL y el
    backend rellena el caso con lo que se preguntó en ese turno. El parámetro se suelta
    en cuanto se usa, o volvería a abrir el formulario en cada recarga.
  */
  const traceId = params.get('traza') ?? ''
  useEffect(() => {
    if (!traceId) return
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('traza')
        return next
      },
      { replace: true },
    )
    void getApiV1AdminPlaygroundCasesDraft({ traceId })
      .then((response) => {
        const draft = response.data as GetApiV1AdminPlaygroundCasesDraft200
        setCreating({ organizationId: draft.organizationId, message: draft.message })
      })
      .catch((e: unknown) =>
        setDraftError(getErrorMessage(e, 'No se pudo recuperar lo que se preguntó en esa corrida.')),
      )
  }, [traceId, setParams])

  const run = () => {
    runSuite.mutate(
      {
        data: {
          organizationId: settings.orgId || undefined,
          model: modelOverride(settings),
          system: system.trim() || undefined,
        },
      },
      {
        onSuccess: (response) => setResult(response.data as PlaygroundSuiteResult),
        onError: (e) => toastApiError(e, 'No se pudo correr el conjunto.'),
      },
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Conjunto de regresión"
        description="Casos guardados con lo que se espera de ellos. Correrlos todos con el prompt nuevo es la forma de saber si algo se rompió."
      />

      <Panel title="Contra qué organización">
        <div className="space-y-3">
          <RunSettingsFields
            settings={settings}
            context={context}
            isLoading={contextPending && !!settings.orgId}
            onChange={set}
            onSelectOrganization={selectOrganization}
            showMode={false}
          />
          {settings.orgId && (
            <QuietButton onClick={() => set({ org: '' })}>
              Ver los casos de todas las organizaciones
            </QuietButton>
          )}
        </div>
      </Panel>

      {draftError && <Note tone="warning">{draftError}</Note>}

      <Panel
        title="Los casos"
        action={
          <Button
            variant="ghost"
            size="sm"
            disabled={!settings.orgId}
            onClick={() => setCreating({ organizationId: settings.orgId, message: '' })}
          >
            <Plus aria-hidden />
            Nuevo caso
          </Button>
        }
      >
        {isError ? (
          <ErrorState error={error} fallback="No se pudieron cargar los casos." />
        ) : (
          <DataList
            columns={columns}
            rows={cases}
            getRowId={(item) => item.id}
            onRowClick={(item) => setEditing(item)}
            isLoading={isPending}
            skeletonRows={5}
            emptyText={
              <EmptyState
                Icon={ListChecks}
                title="Todavía no hay casos"
                description={
                  settings.orgId
                    ? 'Guarda el primero desde la traza de una corrida que salió mal, o créalo aquí.'
                    : 'Elige una organización para crear el primero.'
                }
              />
            }
          />
        )}
      </Panel>

      <Panel title="Correr el conjunto">
        <div className="space-y-4">
          <Field
            label="System prompt para esta corrida"
            htmlFor="pg-suite-system"
            hint="Vacío corre con el vigente. Es el flujo que justifica la pantalla: el prompt nuevo contra todo lo que ya funcionaba."
          >
            <Textarea
              id="pg-suite-system"
              value={system}
              onChange={(e) => setSystem(e.target.value)}
              rows={4}
              className="scrollbar-slim font-mono text-xs"
            />
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={run} disabled={runSuite.isPending || cases.length === 0}>
              <Play aria-hidden />
              Correr {cases.length} {cases.length === 1 ? 'caso' : 'casos'}
            </Button>
            {runSuite.isPending && (
              /*
                El backend los corre **en serie**, así que con veinte casos esto tarda
                minutos. Un spinner honesto dice cuánto puede tardar en vez de fingir que
                está a punto.
              */
              <span className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader size="sm" />
                Van en serie, uno detrás de otro. Con {cases.length} casos esto tarda.
              </span>
            )}
          </div>

          {result && (
            <div className="space-y-3 border-t pt-4">
              <p className="text-sm">
                <span className="nums font-semibold">{result.passed}</span> de{' '}
                <span className="nums">{result.total}</span> pasaron.
              </p>
              <ul className="space-y-2">
                {result.runs.map((caseRun) => (
                  <CaseRunRow
                    key={caseRun.id}
                    run={caseRun}
                    label={cases.find((c) => c.id === caseRun.caseId)?.label ?? caseRun.caseId}
                    onTrace={() => caseRun.traceId && setOpenTrace(caseRun.traceId)}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      </Panel>

      <Panel title="Últimas corridas">
        {suites.isError ? (
          <ErrorState error={suites.error} fallback="No se pudieron cargar las corridas." />
        ) : suites.suites.length === 0 ? (
          <p className="text-muted-foreground text-sm">Todavía no se ha corrido el conjunto.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {suites.suites.map((suite) => (
              <li key={suite.suiteId}>
                <button
                  type="button"
                  onClick={() =>
                    setOpenSuite((prev) => (prev === suite.suiteId ? null : suite.suiteId))
                  }
                  className="hover:bg-accent focus-visible:ring-ring/50 flex w-full items-center gap-3 px-3.5 py-3 text-left text-sm transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">
                      {suite.passed} de {suite.total} pasaron
                    </span>
                    <span className="text-muted-foreground block text-xs">
                      {formatDateHuman(suite.at)} · {suite.model}
                      {suite.systemOverridden ? ' · con otro prompt' : ''}
                    </span>
                  </span>
                  <StatusBadge
                    tone={suite.passed === suite.total ? 'success' : 'destructive'}
                    label={suite.passed === suite.total ? 'Todo bien' : 'Con fallos'}
                  />
                </button>
                {openSuite === suite.suiteId && (
                  <SuiteRuns suiteId={suite.suiteId} onTrace={setOpenTrace} />
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {editing && (
        <CaseFormDrawer
          existing={editing}
          onArchive={() => setRemoving(editing)}
          onClose={() => setEditing(null)}
        />
      )}
      {creating && <CaseFormDrawer draft={creating} onClose={() => setCreating(null)} />}
      {openTrace && <TraceDrawer traceId={openTrace} onClose={() => setOpenTrace(null)} />}

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Archivar el caso"
        description="Deja de correrse con el conjunto. Las corridas que ya lo incluyeron siguen contando lo que pasó."
        confirmLabel="Archivar"
        destructive
        loading={archive.isPending}
        onConfirm={() => {
          if (!removing) return
          archive.mutate(
            { id: removing.id },
            {
              onSuccess: () => {
                toast.success('Caso archivado.')
                setRemoving(null)
                setEditing(null)
              },
              onError: (e) => toastApiError(e, 'No se pudo archivar el caso.'),
            },
          )
        }}
      />
    </div>
  )
}

/** Una línea por caso corrido: pasó o no, y **por qué** no. */
function CaseRunRow({
  run,
  label,
  onTrace,
}: {
  run: PlaygroundCaseRun
  label: string
  onTrace: () => void
}) {
  return (
    <li className="space-y-1.5 rounded-lg border p-3">
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

      {run.traceId && (
        <QuietButton onClick={onTrace}>Ver la traza</QuietButton>
      )}
    </li>
  )
}

function SuiteRuns({ suiteId, onTrace }: { suiteId: string; onTrace: (traceId: string) => void }) {
  const { runs, isPending, isError, error } = usePlaygroundSuiteRuns(suiteId)

  if (isPending) return <div className="px-3.5 pb-3"><Loader size="sm" label="Cargando la corrida" /></div>
  if (isError) {
    return (
      <div className="px-3.5 pb-3">
        <ErrorState error={error} fallback="No se pudo cargar el detalle de la corrida." />
      </div>
    )
  }

  return (
    <ul className="space-y-2 px-3.5 pb-3">
      {runs.map((run) => (
        <CaseRunRow
          key={run.id}
          run={run}
          label={run.caseId}
          onTrace={() => run.traceId && onTrace(run.traceId)}
        />
      ))}
    </ul>
  )
}
