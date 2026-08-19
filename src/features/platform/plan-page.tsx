import { useId, useState } from 'react'
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  MapPin,
  MessageCircle,
  Mic,
  UserCog,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { FeatureMap, LimitMap, PublicPlan } from '@/api/generated/model'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ErrorState } from '@/components/ui/error-state'
import { Note } from '@/components/ui/note'
import { Skeleton } from '@/components/ui/skeleton'
import { formatMonthName, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useCapabilities, usePlans } from './hooks'
import { useLimitUsage, type LimitUsage } from './use-limit-usage'
import { featureTitle, LIMIT_KEYS, limitLabel, planLabel } from './labels'

/** Un entero con separador de miles, que es como se leen 1.500 contactos. */
function count(value: number): string {
  return value.toLocaleString('es-CO')
}

/**
 * En frase y con mayúscula inicial. Las etiquetas viven en plural y en minúscula
 * porque también se meten dentro de una oración («llegaste al tope de
 * contactos»), así que aquí se levantan en vez de duplicar el catálogo.
 */
function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * El precio de un plan.
 *
 * **`null` no es gratis: es «consultar».** El plan gratuito trae `0.00`, así que
 * pintar el vacío como cero convertiría un plan sin precio publicado en una
 * promesa que nadie ha hecho.
 */
function priceLabel(price: PublicPlan['price']): { amount: string; per: string | null } {
  if (!price) return { amount: 'Consultar', per: null }
  return { amount: formatMoney(price.amount, price.currency), per: '/ mes' }
}

/** «200» · «Sin límite» — un tope en `null` es ilimitado, nunca cero. */
function maxLabel(max: number | null): string {
  return max === null ? 'Sin límite' : count(max)
}

/**
 * Cada tope con su icono, que es lo que deja leer la lista de un vistazo en vez
 * de renglón por renglón. El icono va **al tamaño del texto y sin pastilla
 * detrás**: el cuadradito tintado por fila es el tic de plantilla que §11.1
 * prohíbe.
 */
const LIMIT_ICONS: Record<keyof LimitMap, LucideIcon> = {
  max_contacts: Users,
  max_users: UserCog,
  max_branches: MapPin,
  ai_messages_monthly: MessageCircle,
  voice_minutes_monthly: Mic,
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
  const full = ratio !== null && ratio >= 1
  const Icon = LIMIT_ICONS[limit.key as keyof LimitMap]

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="flex min-w-0 items-center gap-2">
          {Icon && <Icon aria-hidden className="text-muted-foreground size-4 shrink-0" />}
          <span className="truncate">
            {capitalize(limitLabel(limit.key))}
            {limit.periodic && <span className="text-muted-foreground"> · este mes</span>}
          </span>
        </span>
        <span className="nums flex shrink-0 items-baseline gap-1.5">
          <span className="text-muted-foreground">
            {used === null ? '—' : count(used)} de {maxLabel(max)}
          </span>
          {/*
            Estar al tope **no es un fallo**: es el plan funcionando como se
            vendió. Por eso se dice con palabras y en ámbar, no con la barra en
            rojo — el rojo de §7 es para lo vencido y lo que falló, y un Free con
            «1 de 1 miembros» lo tendría encendido para siempre.
          */}
          {full && <span className="text-warning font-medium">sin cupo</span>}
        </span>
      </div>
      {/* Sin tope no hay proporción que dibujar: una barra llena al 0 % mentiría. */}
      {max !== null && (
        <div className="bg-secondary h-1 overflow-hidden rounded-full">
          <div
            className={cn(
              'h-full rounded-full transition-[width]',
              ratio !== null && ratio >= 0.8 ? 'bg-warning' : 'bg-brand',
            )}
            style={{ width: `${(ratio ?? 0) * 100}%` }}
          />
        </div>
      )}
    </div>
  )
}

/**
 * Cómo se cambia de plan.
 *
 * El contrato **no publica una compra**: mover una organización de plan es una
 * acción de la consola de plataforma (§47.2). Así que el botón no finge un
 * carrito — dice lo que de verdad pasa, que es lo que §55 pide de cualquier
 * acción que mueve dinero.
 */
function UpgradeDialog({
  plan,
  open,
  onOpenChange,
}: {
  plan: PublicPlan
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Pasar a {plan.name}</DialogTitle>
          <DialogDescription>
            El cambio de plan lo aplica el equipo de Nummo: escríbenos y lo movemos. Lo que ya
            tienes se conserva siempre — cambiar de plan ajusta los topes, nunca borra datos.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Un plan del catálogo, como tarjeta y no como columna de tabla.
 *
 * Una tabla comparativa de cuatro planes por once filas no cabe en 360 px sin
 * desplazarse en horizontal, que es el gesto que §11.1.3 prohíbe para lo que hay
 * que leer entero. Apilada se lee de arriba abajo y en escritorio son columnas.
 *
 * **El plan contratado es el que destaca**, y no hay ningún «Recomendado»: el
 * contrato no publica esa señal, y ponerla aquí sería una decisión de precio
 * escrita en el front (§70: no se inventa lo que el API no firma).
 */
function PlanCard({
  plan,
  features,
  isCurrent,
  onUpgrade,
}: {
  plan: PublicPlan
  /** Solo las features que algún plan incluye: las demás son claves que aún no existen. */
  features: (keyof FeatureMap)[]
  isCurrent: boolean
  onUpgrade: () => void
}) {
  const titleId = useId()
  const price = priceLabel(plan.price)

  return (
    // Agrupada y con nombre: un lector de pantalla anuncia «Básico» al entrar en
    // la tarjeta, en vez de leer once cifras sueltas sin saber de quién son.
    <div
      role="group"
      aria-labelledby={titleId}
      className={cn(
        'relative flex flex-col gap-4 rounded-lg border p-4 pt-5 transition-shadow',
        isCurrent
          ? 'border-brand/60 bg-brand/[0.04] shadow-sm'
          : 'bg-card hover:border-border/80 hover:shadow-sm',
      )}
    >
      {/* Montada sobre el borde: marca la tarjeta sin robarle una línea al contenido. */}
      {isCurrent && (
        <span className="bg-brand text-brand-foreground absolute -top-2.5 left-4 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.68rem] font-medium">
          <Check aria-hidden className="size-3" />
          Tu plan
        </span>
      )}

      <div className="space-y-1">
        <h3 id={titleId} className="font-display text-base font-semibold">
          {plan.name}
        </h3>
        <p className="flex items-baseline gap-1.5">
          <span className="nums font-display text-2xl font-semibold tracking-tight">
            {price.amount}
          </span>
          {price.per && <span className="text-muted-foreground text-sm">{price.per}</span>}
        </p>
        {!price.per && (
          <p className="text-muted-foreground text-xs">Todavía sin precio publicado.</p>
        )}
        {plan.description && (
          <p className="text-muted-foreground pt-1 text-xs leading-relaxed">{plan.description}</p>
        )}
      </div>

      <ul className="space-y-1.5 border-t pt-4 text-sm">
        {LIMIT_KEYS.map((key) => {
          const Icon = LIMIT_ICONS[key]
          return (
            <li key={key} className="flex items-start justify-between gap-3">
              <span className="text-muted-foreground flex min-w-0 items-start gap-2">
                <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
                <span className="min-w-0">{capitalize(limitLabel(key))}</span>
              </span>
              <span className="nums shrink-0 font-medium">{maxLabel(plan.limits[key])}</span>
            </li>
          )
        })}
      </ul>

      {features.length > 0 && (
        <ul className="space-y-1.5 border-t pt-4 text-sm">
          {features.map((key) => {
            const included = plan.features[key]
            return (
              <li
                key={key}
                className={cn(
                  'flex items-start gap-2',
                  included ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {included ? (
                  <CheckCircle2 aria-hidden className="text-brand mt-0.5 size-4 shrink-0" />
                ) : (
                  <Circle aria-hidden className="mt-0.5 size-4 shrink-0 opacity-40" />
                )}
                <span className="min-w-0">{featureTitle(key)}</span>
                <span className="sr-only">{included ? 'incluido' : 'no incluido'}</span>
              </li>
            )
          })}
        </ul>
      )}

      {/* `mt-auto`: los pies quedan alineados aunque las descripciones midan distinto. */}
      <div className="mt-auto pt-1">
        {isCurrent ? (
          <p className="text-muted-foreground border-brand/30 rounded-md border border-dashed py-2 text-center text-sm">
            Tu plan actual
          </p>
        ) : (
          <Button variant="outline" className="w-full" onClick={onUpgrade}>
            Consultar {plan.name}
            <ArrowRight aria-hidden className="size-4" />
          </Button>
        )}
      </div>
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
  const [consulting, setConsulting] = useState<PublicPlan | null>(null)

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
                  Consumo de {formatMonthName(period)}
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
        <div className="space-y-4">
          {/*
            En frase y del color del texto, no la micro-etiqueta en VERSALITAS
            que llevan las páginas de precios: §11.1 la prohíbe justamente porque
            cuando todo grita, nada jerarquiza.
          */}
          <p className="text-muted-foreground max-w-prose text-sm">
            Se paga por capacidad: lo que cambia entre planes es cuánta cartera, cuánto equipo y
            cuánta IA caben. El ciclo completo —cobrar, pagar, mora y reportes— está en todos.
          </p>

          {plansLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-80" />
              ))}
            </div>
          ) : plansError ? (
            <ErrorState error={error} fallback="No se pudieron cargar los planes." />
          ) : (
            <div className="grid items-stretch gap-4 pt-1 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <PlanCard
                  key={plan.code}
                  plan={plan}
                  features={features}
                  isCurrent={plan.code === capabilities?.planCode}
                  onUpgrade={() => setConsulting(plan)}
                />
              ))}
            </div>
          )}
        </div>
      </Panel>

      {consulting && (
        <UpgradeDialog
          plan={consulting}
          open
          onOpenChange={(open) => !open && setConsulting(null)}
        />
      )}
    </div>
  )
}
