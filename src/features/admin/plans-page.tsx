import { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import { toast } from 'sonner'
import type { FeaturePatch, LimitPatch, PlanDto, SavePlanResult } from '@/api/generated/model'
import { PageHeader } from '@/components/page-header'
import { PlatformPage } from './platform-page'
import { Panel } from '@/components/panel'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ui/error-state'
import { Field } from '@/components/ui/field'
import { FormDialog } from '@/components/ui/form-dialog'
import { Input } from '@/components/ui/input'
import { MoneyInput } from '@/components/ui/money-input'
import { NativeSelect } from '@/components/ui/native-select'
import { Note } from '@/components/ui/note'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { Textarea } from '@/components/ui/textarea'
import { toastApiError } from '@/features/platform/errors'
import { FEATURE_KEYS, featureTitle, LIMIT_KEYS, limitLabel } from '@/features/platform/labels'
import { formatMoney } from '@/lib/format'
import { useAdminPlans, useSavePlan } from './hooks'

/** «Sin límite» cuando el tope es `null`; nunca cero. */
function maxLabel(max: number | null | undefined): string {
  if (max === undefined) return '—'
  return max === null ? 'Sin límite' : max.toLocaleString('es-CO')
}

/** `null` es «consultar», no gratis: el plan gratuito trae `0.00`. */
function priceLabel(plan: PlanDto): string {
  return plan.priceAmount === null
    ? 'Sin precio publicado'
    : `${formatMoney(plan.priceAmount, plan.priceCurrency)} / mes`
}

function PlanDialog({
  plan,
  open,
  onOpenChange,
}: {
  plan: PlanDto
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const save = useSavePlan()
  const [name, setName] = useState(plan.name)
  const [description, setDescription] = useState(plan.description ?? '')
  const [isPublic, setIsPublic] = useState(plan.isPublic)
  const [sortOrder, setSortOrder] = useState(String(plan.sortOrder))
  const [price, setPrice] = useState(plan.priceAmount ?? '')
  const [currency, setCurrency] = useState(plan.priceCurrency)
  const [limits, setLimits] = useState<Record<string, string>>({})
  const [features, setFeatures] = useState<Record<string, boolean>>({})
  /** Sin valor por defecto, igual que en el contrato: hay que elegir. */
  const [apply, setApply] = useState<'' | 'yes' | 'no'>('')

  useEffect(() => {
    if (!open) return
    setName(plan.name)
    setDescription(plan.description ?? '')
    setIsPublic(plan.isPublic)
    setSortOrder(String(plan.sortOrder))
    setPrice(plan.priceAmount ?? '')
    setCurrency(plan.priceCurrency)
    setApply('')
    setLimits(
      Object.fromEntries(
        LIMIT_KEYS.map((key) => {
          const value = plan.limits[key]
          return [key, value === null || value === undefined ? '' : String(value)]
        }),
      ),
    )
    setFeatures(Object.fromEntries(FEATURE_KEYS.map((key) => [key, plan.features[key] === true])))
  }, [open, plan])

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (apply === '') {
      toast.error('Elige si el cambio alcanza a las organizaciones que ya tienen este plan.')
      return
    }

    const nextLimits: LimitPatch = {}
    for (const key of LIMIT_KEYS) {
      const raw = limits[key]?.trim() ?? ''
      if (raw === '') {
        nextLimits[key] = null
        continue
      }
      const parsed = Number(raw)
      if (!Number.isInteger(parsed) || parsed < 0) {
        toast.error(`El tope de ${limitLabel(key)} tiene que ser un entero de cero para arriba.`)
        return
      }
      nextLimits[key] = parsed
    }

    const nextFeatures: FeaturePatch = Object.fromEntries(
      FEATURE_KEYS.map((key) => [key, features[key] === true]),
    )

    try {
      const res = await save.mutateAsync({
        code: plan.code,
        data: {
          name: name.trim(),
          description: description.trim() || null,
          isPublic,
          sortOrder: Number(sortOrder) || 0,
          priceAmount: price.trim() || null,
          priceCurrency: currency.trim().toUpperCase(),
          features: nextFeatures,
          limits: nextLimits,
          applyToExisting: apply === 'yes',
        },
      })
      // `customFetch` lanza en los errores, así que aquí solo llega el 200.
      const { recomputed } = res.data as SavePlanResult
      toast.success(
        recomputed > 0
          ? `Plan guardado · alcanzó a ${recomputed} ${recomputed === 1 ? 'organización' : 'organizaciones'}`
          : 'Plan guardado · solo para quien entre desde ahora',
      )
      onOpenChange(false)
    } catch (err) {
      toastApiError(err, 'No se pudo guardar el plan')
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Editar ${plan.name}`}
      submitLabel="Guardar plan"
      loading={save.isPending}
      onSubmit={onSubmit}
    >
      <div className="scrollbar-slim max-h-[55vh] space-y-4 overflow-y-auto pr-1">
        <Field label="Nombre" htmlFor="plan-name" required>
          <Input id="plan-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        </Field>

        <Field label="Descripción" htmlFor="plan-desc">
          <Textarea
            id="plan-desc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Precio mensual"
            htmlFor="plan-price"
            hint="Vacío significa «consultar», no gratis."
          >
            <MoneyInput id="plan-price" value={price} onChange={setPrice} />
          </Field>
          <Field label="Moneda" htmlFor="plan-currency">
            <Input
              id="plan-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              maxLength={3}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="A la venta" htmlFor="plan-public">
            <NativeSelect
              id="plan-public"
              value={isPublic ? 'yes' : 'no'}
              onChange={(e) => setIsPublic(e.target.value === 'yes')}
            >
              <option value="yes">Sí, se ofrece</option>
              <option value="no">No, oculto</option>
            </NativeSelect>
          </Field>
          <Field label="Orden" htmlFor="plan-order">
            <Input
              id="plan-order"
              type="number"
              min={0}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </Field>
        </div>

        {LIMIT_KEYS.map((key) => (
          <Field
            key={key}
            label={limitLabel(key).charAt(0).toUpperCase() + limitLabel(key).slice(1)}
            hint="Vacío es sin límite."
          >
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              value={limits[key] ?? ''}
              onChange={(e) => setLimits((prev) => ({ ...prev, [key]: e.target.value }))}
              aria-label={`Tope de ${limitLabel(key)}`}
            />
          </Field>
        ))}

        {FEATURE_KEYS.map((key) => (
          <Field key={key} label={featureTitle(key)}>
            <NativeSelect
              value={features[key] ? 'yes' : 'no'}
              onChange={(e) =>
                setFeatures((prev) => ({ ...prev, [key]: e.target.value === 'yes' }))
              }
            >
              <option value="yes">Incluida</option>
              <option value="no">No incluida</option>
            </NativeSelect>
          </Field>
        ))}

        {/*
          Sin valor por defecto a propósito, igual que en el contrato: cambiar
          topes o precios sin querer a los clientes que ya están es de las pocas
          cosas realmente difíciles de deshacer.
        */}
        <Field
          label="¿Alcanza a quien ya tiene este plan?"
          htmlFor="plan-apply"
          hint="Si no, el cambio solo afecta a quien entre desde ahora."
          required
        >
          <NativeSelect
            id="plan-apply"
            value={apply}
            onChange={(e) => setApply(e.target.value as '' | 'yes' | 'no')}
          >
            <option value="">Elige una opción…</option>
            <option value="no">No, solo para nuevos</option>
            <option value="yes">Sí, recalcular a los actuales</option>
          </NativeSelect>
        </Field>
      </div>
    </FormDialog>
  )
}

/**
 * **Los planes son filas, no una constante del código**, así que se editan desde
 * aquí: subir un tope o fijar un precio no debería ser un despliegue.
 *
 * Lo que **sí** es código es el catálogo de claves (`FEATURE_KEYS`,
 * `LIMIT_KEYS`): la tabla guarda los valores por plan, no inventa claves nuevas.
 * Una que no esté en el catálogo se ignora al recalcular.
 */
export function AdminPlansPage() {
  const { plans, isPending, isError, error } = useAdminPlans()
  const [editing, setEditing] = useState<PlanDto | null>(null)

  return (
    <PlatformPage>
      <PageHeader
        title="Planes"
        description="Lo que incluye cada plan y a cuánto se vende. Editarlo no cambia nada para nadie hasta que se recalcula."
      />

      <Note tone="warning" title="Editar un plan no alcanza a nadie por sí solo">
        Al guardar hay que decir si el cambio se aplica a las organizaciones que ya lo tienen. Si
        no, solo afecta a quien entre desde ahora — que es el comportamiento normal.
      </Note>

      {isError ? (
        <ErrorState error={error} fallback="No se pudieron cargar los planes." />
      ) : isPending ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : (
        plans.map((plan) => (
          <Panel
            key={plan.code}
            title={plan.name}
            action={
              <Button variant="outline" size="sm" onClick={() => setEditing(plan)}>
                <Pencil aria-hidden className="size-4" />
                <span className="hidden sm:inline">Editar</span>
              </Button>
            }
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="nums font-medium">{priceLabel(plan)}</span>
                <StatusBadge
                  tone={plan.isPublic ? 'success' : 'muted'}
                  label={plan.isPublic ? 'A la venta' : 'Oculto'}
                />
              </div>

              <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                {LIMIT_KEYS.map((key) => (
                  <div key={key} className="flex items-baseline justify-between gap-3">
                    <dt className="text-muted-foreground min-w-0 truncate">{limitLabel(key)}</dt>
                    <dd className="nums shrink-0">{maxLabel(plan.limits[key])}</dd>
                  </div>
                ))}
              </dl>

              <p className="text-muted-foreground text-sm">
                {FEATURE_KEYS.filter((key) => plan.features[key]).map(featureTitle).join(' · ') ||
                  'Sin features de pago'}
              </p>
            </div>
          </Panel>
        ))
      )}

      {editing && (
        <PlanDialog plan={editing} open onOpenChange={(open) => !open && setEditing(null)} />
      )}
    </PlatformPage>
  )
}
