import { useState } from 'react'
import { Columns3, Plus, X } from 'lucide-react'
import { Panel } from '@/components/panel'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { EmptyState } from '@/components/ui/empty-state'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Note } from '@/components/ui/note'
import { Textarea } from '@/components/ui/textarea'
import { RichText } from '@/features/assistant/rich-text'
import { getErrorMessage } from '@/lib/errors'
import type {
  PlaygroundCompareResult,
  PlaygroundContext,
  PlaygroundTrace,
} from '@/api/generated/model'
import { usePlaygroundContext, useCompareVariants } from './hooks'
import { providerLabel } from './labels'
import { RunSettingsFields } from './run-settings-fields'
import { useRunSettings } from './run-settings'
import { TraceHighlights, TraceMissing, TraceView } from './trace-view'

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
  label: String.fromCharCode(65 + index),
  provider: '',
  model: '',
  system: '',
})

/**
 * **El mismo mensaje contra varias variantes**, lado a lado.
 *
 * Corre **siempre en solo lectura y no hay campo para cambiarlo**: dos variantes que
 * escribieran registrarían la operación dos veces. Se dice en pantalla para que nadie lo
 * busque.
 *
 * Cada variante se lleva su propio fallo: si una no tiene clave configurada, esa columna
 * enseña el error y las demás contestan igual.
 */
export function PlaygroundComparePage() {
  const { settings, set, selectOrganization } = useRunSettings()
  const { context, isPending, isError, error } = usePlaygroundContext(settings.orgId)
  const compare = useCompareVariants()

  const [message, setMessage] = useState('')
  const [variants, setVariants] = useState<Variant[]>([emptyVariant(0), emptyVariant(1)])
  const [result, setResult] = useState<PlaygroundCompareResult | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [openTrace, setOpenTrace] = useState<{ label: string; trace: PlaygroundTrace | null } | null>(
    null,
  )

  const patch = (index: number, values: Partial<Variant>) =>
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, ...values } : v)))

  const submit = () => {
    setFailure(null)
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

  return (
    <div className="space-y-5">
      <PageHeader
        title="Comparar variantes"
        description="El mismo mensaje contra dos a cuatro modelos o prompts, para ver cuál contesta mejor y a qué precio."
      />

      <Panel title="Contra qué se prueba">
        <div className="space-y-4">
          <RunSettingsFields
            settings={settings}
            context={context}
            isLoading={isPending && !!settings.orgId}
            onChange={set}
            onSelectOrganization={selectOrganization}
            showMode={false}
            showModel={false}
          />
          <Note title="Siempre en solo lectura">
            No hay modo de escritura aquí, y no es un olvido: dos variantes que escribieran
            registrarían la misma operación dos veces.
          </Note>
        </div>
      </Panel>

      {isError && (
        <p className="text-destructive text-sm">
          {getErrorMessage(error, 'No se pudo cargar la organización.')}
        </p>
      )}

      <Panel
        title="Variantes"
        action={
          variants.length < MAX_VARIANTS ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setVariants((prev) => [...prev, emptyVariant(prev.length)])}
            >
              <Plus aria-hidden />
              Añadir
            </Button>
          ) : undefined
        }
      >
        <div className="space-y-4">
          {variants.map((variant, index) => (
            <VariantEditor
              key={index}
              variant={variant}
              context={context}
              canRemove={variants.length > MIN_VARIANTS}
              onChange={(values) => patch(index, values)}
              onRemove={() => setVariants((prev) => prev.filter((_, i) => i !== index))}
            />
          ))}
        </div>
      </Panel>

      <Panel title="El mensaje">
        <div className="space-y-3">
          <Field label="Lo que se le pregunta a las variantes" htmlFor="pg-compare-mensaje">
            <Textarea
              id="pg-compare-mensaje"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="¿Cuánto me deben este mes?"
            />
          </Field>
          {failure && <p className="text-destructive text-sm">{failure}</p>}
          <Button onClick={submit} disabled={!canRun}>
            {compare.isPending ? 'Corriendo las variantes…' : 'Comparar'}
          </Button>
        </div>
      </Panel>

      {result ? (
        <Panel title="Resultado">
          {/* Columnas que scrollean en horizontal: a 360 px no caben cuatro (§59). */}
          <div className="scrollbar-slim -mx-4 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
            <div className="flex gap-3">
              {result.variants.map((variant) => (
                <article
                  key={variant.label}
                  className="w-72 shrink-0 space-y-3 rounded-lg border p-3"
                >
                  <h3 className="font-display text-sm font-semibold">{variant.label}</h3>

                  {variant.error ? (
                    <p className="text-destructive text-sm">
                      {variant.error.code}: {variant.error.message}
                    </p>
                  ) : (
                    <div className="text-sm leading-relaxed">
                      <RichText text={variant.reply ?? ''} />
                    </div>
                  )}

                  {variant.trace && (
                    <>
                      <TraceHighlights trace={variant.trace} />
                      <button
                        type="button"
                        onClick={() =>
                          setOpenTrace({ label: variant.label, trace: variant.trace })
                        }
                        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 rounded text-xs underline-offset-4 transition-colors hover:underline focus-visible:ring-[3px] focus-visible:outline-none"
                      >
                        Ver la traza
                      </button>
                    </>
                  )}
                </article>
              ))}
            </div>
          </div>
        </Panel>
      ) : (
        !compare.isPending && (
          <EmptyState
            Icon={Columns3}
            title="Todavía no hay nada que comparar"
            description="Elige la organización, escribe el mensaje y define al menos dos variantes."
          />
        )
      )}

      <Drawer
        open={!!openTrace}
        onOpenChange={(open) => !open && setOpenTrace(null)}
        title={openTrace ? `Traza · ${openTrace.label}` : 'Traza'}
      >
        {openTrace?.trace ? <TraceView trace={openTrace.trace} /> : <TraceMissing />}
      </Drawer>
    </div>
  )
}

function VariantEditor({
  variant,
  context,
  canRemove,
  onChange,
  onRemove,
}: {
  variant: Variant
  context: PlaygroundContext | undefined
  canRemove: boolean
  onChange: (values: Partial<Variant>) => void
  onRemove: () => void
}) {
  const providers = context?.testableProviders ?? []
  const suggested = providers.find((p) => p.provider === variant.provider)?.suggestedModels ?? []

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Field label="Etiqueta" htmlFor={`pg-var-${variant.label}`}>
            <Input
              id={`pg-var-${variant.label}`}
              value={variant.label}
              onChange={(e) => onChange({ label: e.target.value })}
            />
          </Field>
        </div>
        {canRemove && (
          <Button variant="ghost" size="icon" onClick={onRemove} aria-label="Quitar variante">
            <X aria-hidden />
          </Button>
        )}
      </div>

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
            list={`pg-modelos-${variant.label}`}
            value={variant.model}
            disabled={!variant.provider}
            placeholder={suggested[0] ?? 'El activo'}
            onChange={(e) => onChange({ model: e.target.value })}
          />
          <datalist id={`pg-modelos-${variant.label}`}>
            {suggested.map((model) => (
              <option key={model} value={model} />
            ))}
          </datalist>
        </Field>
      </div>

      <Field
        label="System prompt"
        hint="Vacío usa el vigente. Lo que se escriba aquí corre solo en esta comparación."
      >
        <Textarea
          value={variant.system}
          onChange={(e) => onChange({ system: e.target.value })}
          rows={3}
          className="scrollbar-slim font-mono text-xs"
        />
      </Field>
    </div>
  )
}
