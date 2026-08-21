import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Columns3, Pencil, Play, Plus, X } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { EmptyState } from '@/components/ui/empty-state'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { Textarea } from '@/components/ui/textarea'
import { RichText } from '@/features/assistant/rich-text'
import { getErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import type {
  PlaygroundCompareResult,
  PlaygroundCompareResultVariantsItem,
  PlaygroundContext,
  PlaygroundTrace,
} from '@/api/generated/model'
import { useCompareVariants, usePlaygroundContext, usePlaygroundTools } from './hooks'
import { providerLabel } from './labels'
import { formatCost, formatMs, formatTokens, totalTokens, SIN_DATO } from './metrics'
import { QuietButton } from './quiet-button'
import { RunContextBar } from './run-context-bar'
import { useRunSettings } from './run-settings'
import { SystemPromptDialog } from './system-prompt-dialog'
import { ToolCatalog } from './tool-catalog'
import { TracePanel } from './trace-drawer'

/** El contrato acepta de dos a cuatro. Menos no compara nada; más no cabe leyéndolo. */
const MIN_VARIANTS = 2
const MAX_VARIANTS = 4

interface Variant {
  label: string
  provider: string
  model: string
  system: string
}

const emptyVariant = (index: number): Variant => ({
  label: `Variante ${String.fromCharCode(65 + index)}`,
  provider: '',
  model: '',
  system: '',
})

/**
 * **Comparar**: la misma pregunta contra varias variantes, lado a lado.
 *
 * La tarjeta **es** la variante, antes y después de correr: primero sus campos, y en
 * cuanto contesta, su respuesta con lo que costó. Antes eran dos cosas separadas —los
 * editores arriba, los resultados abajo— y para saber qué prompt había dado qué respuesta
 * había que contarlas con el dedo.
 *
 * Corre **siempre en solo lectura y no hay campo para cambiarlo**: dos variantes que
 * escribieran registrarían la operación dos veces. Lo dice la barra de contexto, para que
 * nadie lo busque.
 *
 * Y hereda la pregunta de la consola: aquí se llega desde un turno que salió regular, así
 * que volver a teclearlo era el primer trabajo de una pantalla que existe para ahorrarlo.
 */
export function PlaygroundComparePage() {
  const { settings, set, selectOrganization } = useRunSettings()
  const [params, setParams] = useSearchParams()
  const { context, isPending } = usePlaygroundContext(settings.orgId)
  const tools = usePlaygroundTools(settings.orgId, {
    role: settings.role,
    customRoleId: settings.customRoleId || undefined,
    mode: 'read_only',
  })
  const compare = useCompareVariants()

  const [message, setMessage] = useState('')
  const [variants, setVariants] = useState<Variant[]>([emptyVariant(0), emptyVariant(1)])
  const [result, setResult] = useState<PlaygroundCompareResult | null>(null)
  const [editing, setEditing] = useState<number | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [openTrace, setOpenTrace] = useState<{ label: string; trace: PlaygroundTrace | null } | null>(
    null,
  )
  const [toolsOpen, setToolsOpen] = useState(false)
  const [promptOpen, setPromptOpen] = useState(false)

  /*
    La pregunta llega de la consola —«esta respuesta no me convence, compárala»— y se
    suelta del parámetro: dejarla ahí la reviviría en cada recarga.
  */
  const inherited = params.get('mensaje') ?? ''
  useEffect(() => {
    if (!inherited) return
    setMessage(inherited)
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('mensaje')
        return next
      },
      { replace: true },
    )
  }, [inherited, setParams])

  const patch = (index: number, values: Partial<Variant>) =>
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, ...values } : v)))

  const run = () => {
    setFailure(null)
    setResult(null)
    setEditing(null)
    compare.mutate(
      {
        data: {
          organizationId: settings.orgId,
          message: message.trim(),
          role: settings.role,
          customRoleId: settings.customRoleId || undefined,
          variants: variants.map((variant) => ({
            label: variant.label.trim() || '—',
            model:
              variant.provider && variant.model.trim()
                ? {
                    provider: variant.provider as 'anthropic' | 'openai' | 'google' | 'deepseek',
                    model: variant.model.trim(),
                  }
                : undefined,
            system: variant.system.trim() || undefined,
          })),
        },
      },
      {
        onSuccess: (response) => setResult(response.data as PlaygroundCompareResult),
        onError: (e) => setFailure(getErrorMessage(e, 'No se pudo correr la comparación.')),
      },
    )
  }

  const canRun = !!settings.orgId && message.trim().length > 0 && !compare.isPending
  const cheapest = cheapestLabel(result)

  return (
    <div className="bg-background flex h-full min-h-0 flex-col overflow-hidden rounded-xl border">
      <RunContextBar
        settings={settings}
        context={context}
        isLoading={isPending && !!settings.orgId}
        onChange={set}
        onSelectOrganization={selectOrganization}
        tools={{ offered: tools.tools.filter((t) => t.offered).length, total: tools.tools.length }}
        onOpenTools={() => setToolsOpen(true)}
        onOpenPrompt={() => setPromptOpen(true)}
        promptEdited={false}
        allowWrite={false}
      />

      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto px-4 py-5 lg:px-6">
        <div className="mx-auto w-full max-w-6xl space-y-5">
          <PageHeader
            title="Comparar variantes"
            description="La misma pregunta contra dos a cuatro modelos o prompts, para ver cuál contesta mejor y a qué precio."
          >
            <Button onClick={run} disabled={!canRun}>
              <Play aria-hidden />
              {compare.isPending ? 'Corriendo…' : 'Ejecutar comparación'}
            </Button>
          </PageHeader>

          <Field
            label="La pregunta"
            htmlFor="pg-compare-mensaje"
            hint={inherited ? 'Heredada del turno que estabas mirando.' : undefined}
          >
            <Textarea
              id="pg-compare-mensaje"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              placeholder="¿Cuánto me deben este mes?"
            />
          </Field>

          {failure && <p className="text-destructive text-sm">{failure}</p>}

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h2 className="font-display text-sm font-semibold">Variantes ({variants.length})</h2>
              {variants.length < MAX_VARIANTS && (
                <QuietButton
                  onClick={() => setVariants((prev) => [...prev, emptyVariant(prev.length)])}
                >
                  <Plus aria-hidden className="mr-1 inline size-3" />
                  Añadir
                </QuietButton>
              )}
            </div>

            {/* Dos a cuatro columnas repartiéndose el ancho; en móvil, una debajo de otra. */}
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(19rem,1fr))]">
              {variants.map((variant, index) => {
                const outcome = result?.variants[index]
                const open = editing === index || !outcome
                return (
                  <VariantCard
                    key={index}
                    variant={variant}
                    context={context}
                    outcome={outcome}
                    busy={compare.isPending}
                    open={open}
                    cheapest={!!outcome && outcome.label === cheapest}
                    canRemove={variants.length > MIN_VARIANTS}
                    onChange={(values) => patch(index, values)}
                    onEdit={() => setEditing(open ? null : index)}
                    onRemove={() => setVariants((prev) => prev.filter((_, i) => i !== index))}
                    onTrace={() =>
                      outcome && setOpenTrace({ label: outcome.label, trace: outcome.trace })
                    }
                  />
                )
              })}
            </div>
          </div>

          {!result && !compare.isPending && (
            <EmptyState
              Icon={Columns3}
              title="Todavía no hay nada que comparar"
              description="Escribe la pregunta, define las variantes y ejecuta. Cada una se lleva su propio fallo: si a una le falta la clave, las demás contestan igual."
            />
          )}
        </div>
      </div>

      {openTrace && (
        <TracePanel
          trace={openTrace.trace}
          label={openTrace.label}
          onClose={() => setOpenTrace(null)}
        />
      )}

      {promptOpen && context && (
        <SystemPromptDialog
          context={context}
          value={context.systemPrompt}
          onSave={() => {}}
          onClose={() => setPromptOpen(false)}
        />
      )}

      <Drawer open={toolsOpen} onOpenChange={setToolsOpen} title="Herramientas de la corrida">
        <ToolCatalog
          tools={tools.tools}
          isPending={tools.isPending}
          isError={tools.isError}
          error={tools.error}
        />
      </Drawer>
    </div>
  )
}

/**
 * La más barata de las que contestaron.
 *
 * Es la comparación que casi siempre se viene a hacer, y sacarla a ojo entre cuatro cifras
 * de cuatro decimales es justo lo que una pantalla debería ahorrar. Solo se marca si hay
 * con qué comparar: sin precio configurado no hay «más barata» que valga.
 */
function cheapestLabel(result: PlaygroundCompareResult | null): string | null {
  if (!result) return null
  const priced = result.variants.filter((v) => !v.error && typeof v.trace?.costMicroUsd === 'number')
  if (priced.length < 2) return null
  return priced.reduce((best, v) =>
    (v.trace?.costMicroUsd ?? 0) < (best.trace?.costMicroUsd ?? 0) ? v : best,
  ).label
}

function VariantCard({
  variant,
  context,
  outcome,
  busy,
  open,
  cheapest,
  canRemove,
  onChange,
  onEdit,
  onRemove,
  onTrace,
}: {
  variant: Variant
  context: PlaygroundContext | undefined
  outcome: PlaygroundCompareResultVariantsItem | undefined
  busy: boolean
  open: boolean
  cheapest: boolean
  canRemove: boolean
  onChange: (values: Partial<Variant>) => void
  onEdit: () => void
  onRemove: () => void
  onTrace: () => void
}) {
  const providers = context?.testableProviders ?? []
  const suggested = providers.find((p) => p.provider === variant.provider)?.suggestedModels ?? []
  const tokens = outcome?.trace ? totalTokens(outcome.trace.usage) : null

  return (
    <article
      className={cn(
        'bg-card flex flex-col rounded-lg border',
        cheapest && 'border-success/50 ring-success/20 ring-1',
      )}
    >
      <header className="flex items-center gap-2 border-b px-3.5 py-2.5">
        <h3 className="min-w-0 flex-1 truncate text-sm font-medium">
          {variant.label.trim() || '—'}
        </h3>
        {cheapest && <StatusBadge tone="success" label="Más barata" />}
        {outcome && (
          <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Editar la variante">
            <Pencil aria-hidden className="size-3.5" />
          </Button>
        )}
        {canRemove && !outcome && (
          <Button variant="ghost" size="icon" onClick={onRemove} aria-label="Quitar la variante">
            <X aria-hidden className="size-3.5" />
          </Button>
        )}
      </header>

      {open ? (
        <div className="space-y-3 p-3.5">
          <Field label="Etiqueta">
            <Input value={variant.label} onChange={(e) => onChange({ label: e.target.value })} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Proveedor">
              <NativeSelect
                value={variant.provider}
                disabled={providers.length === 0}
                onChange={(e) => onChange({ provider: e.target.value, model: '' })}
              >
                <option value="">El de la organización</option>
                {providers.map((p) => (
                  <option key={p.provider} value={p.provider}>
                    {p.label || providerLabel(p.provider)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Modelo">
              <Input
                value={variant.model}
                disabled={!variant.provider}
                placeholder={suggested[0] ?? 'El activo'}
                onChange={(e) => onChange({ model: e.target.value })}
              />
            </Field>
          </div>
          <Field label="System prompt" hint="Vacío usa el vigente.">
            <Textarea
              value={variant.system}
              onChange={(e) => onChange({ system: e.target.value })}
              rows={3}
              className="scrollbar-slim font-mono text-xs"
            />
          </Field>
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col gap-3 p-3.5">
          {busy ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ) : outcome?.error ? (
            /* Cada variante se lleva su propio fallo: las demás contestan igual. */
            <p className="text-destructive text-sm">
              <span className="font-medium">{outcome.error.code}</span> · {outcome.error.message}
            </p>
          ) : (
            <div className="min-w-0 flex-1 text-sm leading-relaxed">
              <RichText text={outcome?.reply ?? ''} />
            </div>
          )}

          <dl className="grid grid-cols-3 gap-2 border-t pt-3 text-xs">
            <Metric
              label="Coste"
              value={outcome?.trace ? formatCost(outcome.trace.costMicroUsd) : SIN_DATO}
            />
            <Metric
              label="Tiempo"
              value={outcome?.trace ? formatMs(outcome.trace.timings.totalMs) : SIN_DATO}
            />
            <Metric label="Tokens" value={tokens === null ? SIN_DATO : formatTokens(tokens)} />
          </dl>

          {outcome?.trace && <QuietButton onClick={onTrace}>Ver la traza</QuietButton>}
        </div>
      )}
    </article>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground truncate text-[0.68rem] tracking-wide uppercase">
        {label}
      </dt>
      <dd className="nums mt-0.5 truncate font-medium" title={value}>
        {value}
      </dd>
    </div>
  )
}
