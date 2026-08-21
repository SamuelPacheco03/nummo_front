import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Play, Plus } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Field } from '@/components/ui/field'
import { Loader } from '@/components/ui/loader'
import { Note } from '@/components/ui/note'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Textarea } from '@/components/ui/textarea'
import { toastApiError } from '@/features/platform/errors'
import { getApiV1AdminPlaygroundCasesDraft } from '@/api/generated/endpoints/platform-playground/platform-playground'
import { getErrorMessage } from '@/lib/errors'
import { formatDateHuman } from '@/lib/format'
import { useListFilters } from '@/lib/use-list-filters'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type {
  GetApiV1AdminPlaygroundCasesDraft200,
  PlaygroundCase,
  PlaygroundCaseRun,
  PlaygroundSuiteResult,
} from '@/api/generated/model'
import { CaseFormDrawer, type CaseDraft } from './case-form'
import { CasesTab } from './cases-tab'
import {
  useArchiveCase,
  usePlaygroundCases,
  usePlaygroundSuiteRuns,
  usePlaygroundSuites,
  useRunSuite,
} from './hooks'
import { OrganizationFilter } from './panel-filters'
import { useRunSettings } from './run-settings'
import { SuitesTab } from './suites-tab'

/**
 * **Proteger**: el conjunto de regresión.
 *
 * Es lo que convierte el playground en instrumento — «¿este cambio de prompt rompió algo
 * que ayer funcionaba?» no se responde conversando— y son dos cosas distintas que antes
 * compartían pantalla a codazos: **los casos** (qué está protegido) y **las corridas**
 * (cómo fue cada ejecución).
 *
 * Correr el conjunto deja en la pestaña de corridas, con la recién hecha abierta: quien
 * lanza doce casos viene a ver **esos**, no a buscarlos.
 */

const KEYS = ['vista', 'traza'] as const
type Key = (typeof KEYS)[number]

type Tab = 'casos' | 'corridas'

const TABS: { value: Tab; label: string }[] = [
  { value: 'casos', label: 'Casos' },
  { value: 'corridas', label: 'Corridas' },
]

export function PlaygroundProtegerPage() {
  const { values, set } = useListFilters<Key>('nummo:playground:proteger', KEYS)
  const { settings, selectOrganization, set: setRun } = useRunSettings()
  const [params, setParams] = useSearchParams()

  const tab = (TABS.find((t) => t.value === values.vista)?.value ?? 'casos') as Tab
  const { cases, isPending, isError, error } = usePlaygroundCases(settings.orgId || undefined)
  const suites = usePlaygroundSuites(2)
  const runSuite = useRunSuite()
  const archive = useArchiveCase()

  const [editing, setEditing] = useState<PlaygroundCase | null>(null)
  const [creating, setCreating] = useState<CaseDraft | null>(null)
  const [removing, setRemoving] = useState<PlaygroundCase | null>(null)
  const [system, setSystem] = useState('')
  const [freshSuite, setFreshSuite] = useState<string | null>(null)
  const [draftError, setDraftError] = useState<string | null>(null)

  // Las dos últimas corridas: la de ahora da el estado de cada caso, y la anterior dice
  // cuáles cambiaron de bando.
  const last = usePlaygroundSuiteRuns(suites.suites[0]?.suiteId)
  const before = usePlaygroundSuiteRuns(suites.suites[1]?.suiteId)
  const lastRuns = useMemo(() => byCase(last.runs), [last.runs])
  const previousRuns = useMemo(() => byCase(before.runs), [before.runs])
  const regressions = useMemo(
    () => countRegressions(lastRuns, previousRuns),
    [lastRuns, previousRuns],
  )

  /*
    «Guardar como caso» desde la traza de una corrida: llega el id por la URL y el backend
    rellena el caso con lo que se preguntó en ese turno. El parámetro se suelta en cuanto
    se usa, o volvería a abrir el formulario en cada recarga.
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

  const run = (caseIds?: string[]) => {
    runSuite.mutate(
      {
        data: {
          organizationId: settings.orgId || undefined,
          caseIds,
          system: system.trim() || undefined,
        },
      },
      {
        onSuccess: (response) => {
          const suite = response.data as PlaygroundSuiteResult
          setFreshSuite(suite.suiteId)
          set({ vista: 'corridas' })
          toast.success(`${suite.passed} de ${suite.total} pasaron.`)
        },
        onError: (e) => toastApiError(e, 'No se pudo correr el conjunto.'),
      },
    )
  }

  const lastSuite = suites.suites[0]

  return (
    <div className="scrollbar-slim h-full min-h-0 overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl space-y-4 px-1 py-1">
        <PageHeader
          title="Proteger"
          description="Casos guardados con lo que se espera de ellos. Correrlos con el prompt nuevo es la forma de saber si algo se rompió."
        >
          <Button
            variant="outline"
            disabled={!settings.orgId}
            onClick={() => setCreating({ organizationId: settings.orgId, message: '' })}
          >
            <Plus aria-hidden />
            Nuevo caso
          </Button>
          <Button onClick={() => run()} disabled={runSuite.isPending || cases.length === 0}>
            <Play aria-hidden />
            Correr {cases.length}
          </Button>
        </PageHeader>

        <div className="grid gap-3 sm:grid-cols-3">
          <Kpi label="Casos protegidos" value={cases.length.toLocaleString('es-CO')} />
          <Kpi
            label="Última corrida"
            value={lastSuite ? `${lastSuite.passed} de ${lastSuite.total}` : '—'}
            sub={lastSuite ? formatDateHuman(lastSuite.at) : 'Todavía no se ha corrido'}
          />
          {/*
            La cifra que decide si hay trabajo: cuáles pasaban y ya no. No la da el
            contrato — sale de restar las corridas de las dos últimas suites, que son datos
            reales, no una estimación.
          */}
          <Kpi
            label="Empezaron a fallar"
            value={regressions === null ? '—' : String(regressions)}
            sub={regressions === null ? 'Hace falta una corrida anterior' : 'pasaban en la anterior'}
            alarming={!!regressions}
          />
        </div>

        <SegmentedControl
          aria-label="Qué se mira"
          options={TABS}
          value={tab}
          onChange={(vista) => set({ vista })}
        />

        {draftError && <Note tone="warning">{draftError}</Note>}

        {tab === 'casos' && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <OrganizationFilter
                organizationId={settings.orgId}
                onSelect={selectOrganization}
                onClear={() => setRun({ org: '' })}
                clearLabel="Ver los casos de todas las organizaciones"
              />
              <Field
                label="System prompt para la corrida"
                htmlFor="pg-suite-system"
                hint="Vacío corre con el vigente. Es el flujo que justifica la pantalla."
              >
                <Textarea
                  id="pg-suite-system"
                  value={system}
                  onChange={(e) => setSystem(e.target.value)}
                  rows={3}
                  className="scrollbar-slim font-mono text-xs"
                />
              </Field>
            </div>

            {runSuite.isPending && (
              /*
                El backend los corre **en serie**, así que con veinte casos esto tarda
                minutos. Un spinner honesto dice cuánto puede tardar en vez de fingir que
                está a punto.
              */
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader size="sm" label="Corriendo el conjunto" />
                Van en serie, uno detrás de otro. Con {cases.length} casos esto tarda.
              </div>
            )}

            <CasesTab
              cases={cases}
              isPending={isPending}
              isError={isError}
              error={error}
              lastRuns={lastRuns}
              organizationId={settings.orgId}
              onEdit={setEditing}
              onCreate={() => setCreating({ organizationId: settings.orgId, message: '' })}
              running={runSuite.isPending}
            />
          </div>
        )}

        {tab === 'corridas' && (
          <div className="pb-2">
            <SuitesTab cases={cases} openSuiteId={freshSuite} />
          </div>
        )}

        {editing && (
          <CaseFormDrawer
            existing={editing}
            onArchive={() => setRemoving(editing)}
            onClose={() => setEditing(null)}
          />
        )}
        {creating && <CaseFormDrawer draft={creating} onClose={() => setCreating(null)} />}

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
    </div>
  )
}

/** La última corrida de cada caso, por su id. */
function byCase(runs: PlaygroundCaseRun[]): Map<string, PlaygroundCaseRun> {
  return new Map(runs.map((run) => [run.caseId, run]))
}

/**
 * Cuántos pasaban en la corrida anterior y fallan en la última.
 *
 * `null` cuando no hay anterior con qué comparar: sin ella no se sabe si un fallo es nuevo
 * o lleva ahí una semana, y decir «0» sería afirmar que no ha cambiado nada.
 */
function countRegressions(
  last: Map<string, PlaygroundCaseRun>,
  previous: Map<string, PlaygroundCaseRun>,
): number | null {
  if (previous.size === 0) return null
  let count = 0
  for (const [caseId, run] of last) {
    if (!run.passed && previous.get(caseId)?.passed) count++
  }
  return count
}

function Kpi({
  label,
  value,
  sub,
  alarming = false,
}: {
  label: string
  value: string
  sub?: string
  alarming?: boolean
}) {
  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div
        className={cn(
          'nums font-display mt-1 text-2xl font-semibold tracking-tight',
          alarming && 'text-destructive',
        )}
      >
        {value}
      </div>
      {sub && <div className="text-muted-foreground mt-1 text-xs">{sub}</div>}
    </div>
  )
}
