import { useId } from 'react'
import { Check, Minus } from 'lucide-react'
import type { FeatureMap, PublicPlan } from '@/api/generated/model'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { ErrorState } from '@/components/ui/error-state'
import { Note } from '@/components/ui/note'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatMonthLabel, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useCapabilities, useLimitUsage, usePlans, type LimitUsage } from './hooks'
import { featureTitle, LIMIT_KEYS, limitLabel, planLabel } from './labels'

/** Un entero con separador de miles, que es como se leen 1.500 contactos. */
function count(value: number): string {
  return value.toLocaleString('es-CO')
}

/**
 * El precio de un plan.
 *
 * **`null` no es gratis: es «consultar».** El plan gratuito trae `0.00`, así que
 * pintar el vacío como cero convertiría un plan sin precio publicado en una
 * promesa que nadie ha hecho.
 */
function priceLabel(price: PublicPlan['price']): string {
  if (!price) return 'Consultar'
  return `${formatMoney(price.amount, price.currency)} / mes`
}

/** «200» · «Sin límite» — un tope en `null` es ilimitado, nunca cero. */
function maxLabel(max: number | null): string {
  return max === null ? 'Sin límite' : count(max)
}

/**
 * Cuánto llevas de un tope.
 *
 * La barra es el dato secundario: lo que se lee primero son las dos cifras, que
 * es lo que responde «¿me queda?». Y el color no va solo (§7) — la proporción se
 * lee igual en escala de grises.
 */
function LimitMeter({ limit }: { limit: LimitUsage }) {
  const { used, max } = limit
  const ratio = used !== null && max !== null && max > 0 ? Math.min(used / max, 1) : null
  const tone =
    ratio === null ? 'bg-brand' : ratio >= 1 ? 'bg-destructive' : ratio >= 0.8 ? 'bg-warning' : 'bg-brand'

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 truncate">
          {limitLabel(limit.key).charAt(0).toUpperCase() + limitLabel(limit.key).slice(1)}
          {limit.periodic && <span className="text-muted-foreground"> · este mes</span>}
        </span>
        <span className="nums text-muted-foreground shrink-0">
          {used === null ? '—' : count(used)} de {maxLabel(max)}
        </span>
      </div>
      {/* Sin tope no hay proporción que dibujar: una barra llena al 0 % mentiría. */}
      {max !== null && (
        <div className="bg-secondary h-1.5 overflow-hidden rounded-full">
          <div
            className={cn('h-full rounded-full transition-[width]', tone)}
            style={{ width: `${(ratio ?? 0) * 100}%` }}
          />
        </div>
      )}
    </div>
  )
}

/**
 * Un plan del catálogo, como tarjeta y no como columna de tabla.
 *
 * Una tabla comparativa de cuatro planes por once filas no cabe en 360 px sin
 * desplazarse en horizontal, que es el gesto que §11.1.3 prohíbe para lo que hay
 * que leer entero. Apilada se lee de arriba abajo y en escritorio son columnas.
 */
function PlanCard({
  plan,
  features,
  isCurrent,
}: {
  plan: PublicPlan
  /** Solo las features que algún plan incluye: las demás son claves que aún no existen. */
  features: (keyof FeatureMap)[]
  isCurrent: boolean
}) {
  const titleId = useId()

  return (
    // Agrupada y con nombre: un lector de pantalla anuncia «Básico» al entrar en
    // la tarjeta, en vez de leer once cifras sueltas sin saber de quién son.
    <div
      role="group"
      aria-labelledby={titleId}
      className={cn(
        'flex flex-col gap-4 rounded-lg border p-4',
        isCurrent ? 'border-brand/50 bg-brand/5' : 'bg-card',
      )}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h3 id={titleId} className="font-display text-base font-semibold">
            {plan.name}
          </h3>
          {isCurrent && <StatusBadge tone="success" label="Tu plan" />}
        </div>
        <p className="nums text-lg font-semibold tracking-tight">{priceLabel(plan.price)}</p>
        {plan.description && <p className="text-muted-foreground text-xs">{plan.description}</p>}
      </div>

      <ul className="space-y-1 text-sm">
        {LIMIT_KEYS.map((key) => (
          <li key={key} className="flex items-baseline justify-between gap-3">
            <span className="text-muted-foreground min-w-0 truncate">{limitLabel(key)}</span>
            <span className="nums shrink-0">{maxLabel(plan.limits[key])}</span>
          </li>
        ))}
      </ul>

      {features.length > 0 && (
        <ul className="space-y-1 border-t pt-3 text-sm">
          {features.map((key) => {
            const included = plan.features[key]
            return (
              <li
                key={key}
                className={cn('flex items-center gap-2', !included && 'text-muted-foreground')}
              >
                {included ? (
                  <Check aria-hidden className="text-success-strong size-4 shrink-0" />
                ) : (
                  <Minus aria-hidden className="size-4 shrink-0" />
                )}
                <span className="min-w-0 truncate">{featureTitle(key)}</span>
                <span className="sr-only">{included ? 'incluido' : 'no incluido'}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/**
 * **Qué incluye tu plan y cuánto llevas usado.**
 *
 * Es la pantalla a la que apunta todo `LIMIT_EXCEEDED` y todo
 * `FEATURE_NOT_AVAILABLE` (§45.5): cuando el backend dice «no te alcanza», aquí
 * se ve por qué y qué haría falta.
 */
export function PlanPage() {
  const { capabilities, isLoading: capsLoading, isError: capsError } = useCapabilities()
  const { limits, period } = useLimitUsage()
  const { plans, isLoading: plansLoading, isError: plansError, error } = usePlans()

  // Las cuatro features que ningún plan incluye todavía existen como clave y se
  // encenderán cuando se construyan; anunciarlas hoy como «✗» en las cuatro
  // columnas es ruido que no compara nada.
  const features = (Object.keys(plans[0]?.features ?? {}) as (keyof FeatureMap)[]).filter((key) =>
    plans.some((plan) => plan.features[key]),
  )

  return (
    <div className="space-y-4">
      <PageHeader
        title="Plan y consumo"
        description="Qué incluye tu plan, cuánto llevas usado este período y qué ofrecen los demás."
      />

      <Panel title="Tu plan">
        {capsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        ) : capsError || !capabilities ? (
          <ErrorState error={null} fallback="No se pudo cargar tu plan." />
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-display text-2xl font-semibold tracking-tight">
                {planLabel(capabilities.planCode)}
              </span>
              {period && (
                <span className="text-muted-foreground text-sm">
                  Consumo de {formatMonthLabel(period)}
                </span>
              )}
            </div>

            <div className="space-y-3.5">
              {limits.map((limit) => (
                <LimitMeter key={limit.key} limit={limit} />
              ))}
            </div>

            <Note tone="info">
              Un tope lleno bloquea crear, nunca borra lo que ya existe. Los aforos se liberan
              archivando —lo archivado no gasta cupo— y las cuotas del mes se renuevan solas.
            </Note>
          </div>
        )}
      </Panel>

      <Panel title="Planes">
        {plansLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : plansError ? (
          <ErrorState error={error} fallback="No se pudieron cargar los planes." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard
                key={plan.code}
                plan={plan}
                features={features}
                isCurrent={plan.code === capabilities?.planCode}
              />
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}
