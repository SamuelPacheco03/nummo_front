import { useState } from 'react'
import {
  ArrowRight,
  MapPin,
  MessageCircle,
  MessageSquareText,
  Mic,
  UserCog,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { FeatureMap, LimitMap, PublicPlan } from '@/api/generated/model'
import { PageHeader } from '@/components/page-header'
import { PlanCard } from '@/components/plan-card'
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
  whatsapp_messages_monthly: MessageSquareText,
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
 * Una tabla comparativa de cuatro planes por once filas no cabe en 360 px sin desplazarse
 * en horizontal, que es el gesto que §11.1.3 prohíbe para lo que hay que leer entero.
 * Apilada se lee de arriba abajo y en escritorio son columnas.
 *
 * La tarjeta es **la misma que usa la portada** (`components/plan-card.tsx`): aquí solo se
 * traduce la forma del contrato —mapas— a la que ella espera.
 *
 * **El plan contratado es el que destaca, y no hay ningún «Recomendado»**: el contrato no
 * publica esa señal, y ponerla aquí sería una decisión de precio escrita en el front (§70).
 */
function PlanDelCatalogo({
  plan,
  features,
  isCurrent,
  onUpgrade,
  denso = false,
}: {
  plan: PublicPlan
  /** Solo las features que algún plan incluye: las demás son claves que aún no existen. */
  features: (keyof FeatureMap)[]
  isCurrent: boolean
  onUpgrade: () => void
  /** Apretada: la usa el catálogo del diálogo, donde el alto es el que manda. */
  denso?: boolean
}) {
  const price = priceLabel(plan.price)

  return (
    <PlanCard
      denso={denso}
      nombre={plan.name}
      codigo={plan.code}
      precio={price.per ? { monto: price.amount, porMes: true } : null}
      descripcion={plan.description}
      topes={LIMIT_KEYS.map((key) => ({
        key,
        label: capitalize(limitLabel(key)),
        valor: maxLabel(plan.limits[key]),
      }))}
      funciones={features.map((key) => ({
        key,
        label: featureTitle(key),
        included: Boolean(plan.features[key]),
      }))}
      destacado={isCurrent}
      insignia={isCurrent ? { texto: 'Tu plan', tono: 'actual' } : null}
      accion={
        isCurrent ? (
          <p className="rounded-full border border-dashed border-brand/30 py-2.5 text-center text-sm text-muted-foreground">
            Tu plan actual
          </p>
        ) : (
          <Button variant="outline" className="w-full rounded-full" onClick={onUpgrade}>
            Consultar {plan.name}
            <ArrowRight aria-hidden className="size-4" />
          </Button>
        )
      }
    />
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
  const [catalogo, setCatalogo] = useState(false)

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
            <>
              {/*
                **En escritorio el catálogo se abre, no se incrusta.** Dentro del panel las
                tres tarjetas se quedaban en unos 300 px y todo se partía en dos líneas: los
                nombres de los topes truncados, el precio en dos renglones. El diálogo les da
                el ancho que necesitan para leerse de un vistazo, que es justo lo que una
                comparación de planes tiene que permitir.
              */}
              <div className="hidden lg:block">
                <Button variant="outline" onClick={() => setCatalogo(true)}>
                  Ver planes
                  <ArrowRight aria-hidden className="size-4" />
                </Button>
              </div>

              {/*
                En móvil van apilados y a la vista. Un modal en un teléfono ocupa la pantalla
                entera y añade un paso para ver lo mismo: ahí el problema del ancho no existe,
                porque las tarjetas ya van una debajo de otra.
              */}
              <div className="grid items-stretch gap-4 pt-1 sm:grid-cols-2 lg:hidden">
                {plans.map((plan) => (
                  <PlanDelCatalogo
                    key={plan.code}
                    plan={plan}
                    features={features}
                    isCurrent={plan.code === capabilities?.planCode}
                    onUpgrade={() => setConsulting(plan)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </Panel>

      <Dialog open={catalogo} onOpenChange={setCatalogo}>
        {/*
          Ancho y alto salen del espacio disponible, no de un tamaño fijo: el diálogo por
          defecto se queda en `max-w-lg` y las tres tarjetas se apretaban hasta partir cada
          rótulo en dos líneas. Con `min()` crece hasta llenar la pantalla y se detiene antes
          de pegarse a los bordes.

          `aria-describedby={undefined}` porque este diálogo **no lleva descripción**: sin
          eso, Radix avisa por consola de que falta. Lo que había explicaba lo mismo que ya
          dice el panel de detrás, y su única consecuencia visible era robarle alto a las
          tarjetas — que es justo lo que sobra aquí.
        */}
        <DialogContent
          aria-describedby={undefined}
          className="w-[min(96vw,84rem)] max-w-none max-h-[94dvh] p-5 sm:p-6"
        >
          <DialogHeader>
            <DialogTitle>Planes</DialogTitle>
          </DialogHeader>
          <div className="grid items-stretch gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <PlanDelCatalogo
                key={plan.code}
                plan={plan}
                features={features}
                isCurrent={plan.code === capabilities?.planCode}
                denso
                /*
                  Cierra el catálogo antes de abrir la consulta: dos diálogos apilados dejan
                  al segundo bajo el velo del primero y la tecla `esc` cierra el equivocado.
                */
                onUpgrade={() => {
                  setCatalogo(false)
                  setConsulting(plan)
                }}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>

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
