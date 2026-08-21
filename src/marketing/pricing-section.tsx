import { Check, Minus, RefreshCw } from 'lucide-react'
import { getApiV1PublicPricing } from '@/api/generated/endpoints/public/public'
import type { PricingPlan } from '@/api/generated/model'
import { cn } from '@/lib/utils'
import { SectionHeading } from './section-heading'
import {
  clavesDeFunciones,
  etiquetaDeFuncion,
  incluye,
  leerPrecio,
  leerTope,
  ordenarPlanes,
} from './pricing'
import type { Cola } from './signals'
import { useRecursoPublico } from './use-public-data'
import { useSectionViewed } from './use-section-viewed'
import { rutasApp } from './links'

/**
 * Los precios.
 *
 * **No está en los mockups y aquí sí va**: es la razón de que exista `/public/pricing` y
 * de que se decidiera publicar la tarifa. Se maqueta con el lenguaje de las demás
 * secciones —rótulo, titular a dos tonos, tarjetas— en vez de inventarle uno propio.
 *
 * Lo que llega es **lo publicable y ya viene filtrado**: si una función no aparece, no es
 * un bug, es que todavía no se anuncia. El front no la inventa.
 */

async function cargarPrecios() {
  const res = await getApiV1PublicPricing()
  if (res.status !== 200) throw new Error('precios no disponibles')
  return res.data.plans
}

function Precio({ plan }: { plan: PricingPlan }) {
  const { texto, consultar } = leerPrecio(plan.price)
  return (
    <p
      className={cn(
        'mt-3 text-3xl font-semibold tracking-tight tabular-nums',
        consultar ? 'text-muted-foreground' : 'text-foreground',
      )}
    >
      {texto}
      {!consultar && plan.price && Number(plan.price.amount) > 0 && (
        <span className="ml-1 text-sm font-normal text-muted-foreground">/mes</span>
      )}
    </p>
  )
}

function TarjetaPlan({
  plan,
  claves,
  planes,
  destacado,
  onElegir,
}: {
  plan: PricingPlan
  claves: readonly string[]
  planes: readonly PricingPlan[]
  destacado: boolean
  onElegir: () => void
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col rounded-2xl p-6',
        destacado ? 'bg-chat-bubble' : 'border border-border bg-card',
      )}
    >
      <p className="text-sm font-semibold text-foreground">{plan.name}</p>
      <Precio plan={plan} />
      {plan.description && (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{plan.description}</p>
      )}

      {plan.limits.length > 0 && (
        <dl className="mt-5 space-y-1.5 border-t border-border pt-5 text-sm">
          {plan.limits.map((l) => (
            <div key={l.key} className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">{l.label}</dt>
              <dd className="shrink-0 font-medium text-foreground tabular-nums">{leerTope(l)}</dd>
            </div>
          ))}
        </dl>
      )}

      {claves.length > 0 && (
        <ul className="mt-5 space-y-2 border-t border-border pt-5 text-sm">
          {claves.map((key) => {
            const estado = incluye(plan, key)
            /*
              `undefined` no se pinta como «no»: el backend no anuncia esa función para
              este plan, y decir que no la tiene sería afirmar algo que nadie dijo.
            */
            if (estado === undefined) return null
            return (
              <li key={key} className="flex items-start gap-2">
                {estado ? (
                  <Check className="mt-0.5 size-4 shrink-0 text-success-strong" aria-hidden />
                ) : (
                  <Minus className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                )}
                <span className={estado ? 'text-foreground' : 'text-muted-foreground'}>
                  {etiquetaDeFuncion(planes, key)}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      <a
        href={rutasApp.registro}
        onClick={onElegir}
        className={cn(
          'mt-6 inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
          destacado
            ? 'bg-primary text-primary-foreground hover:bg-primary-hover'
            : 'border border-border text-foreground hover:bg-accent',
        )}
      >
        Empezar
      </a>
    </div>
  )
}

export function PricingSection({ cola }: { cola: Cola | null }) {
  const ref = useSectionViewed(cola, 'pricing')
  const estado = useRecursoPublico(cargarPrecios)

  return (
    <section ref={ref} id="precios" className="bg-background px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          rotulo="Precios"
          principal="Empieza gratis."
          secundaria="Crece cuando te toque."
        />

        <div className="mt-14">
          {estado.fase === 'cargando' && (
            <div className="grid gap-5 md:grid-cols-3" aria-busy>
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-80 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          )}

          {estado.fase === 'error' && (
            <div className="rounded-2xl border border-border bg-card p-10 text-center">
              <p className="text-sm text-muted-foreground">
                No pudimos cargar los planes ahora mismo.
              </p>
              <button
                type="button"
                onClick={estado.reintentar}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-full border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <RefreshCw className="size-4" aria-hidden />
                Reintentar
              </button>
            </div>
          )}

          {estado.fase === 'listo' && estado.datos.length === 0 && (
            <div className="rounded-2xl border border-border bg-card p-10 text-center">
              <p className="text-sm text-muted-foreground">
                Estamos afinando los planes. Escribinos y te contamos qué encaja con tu caso.
              </p>
            </div>
          )}

          {estado.fase === 'listo' && estado.datos.length > 0 && (
            <Planes planes={estado.datos} cola={cola} />
          )}
        </div>
      </div>
    </section>
  )
}

function Planes({ planes, cola }: { planes: PricingPlan[]; cola: Cola | null }) {
  const ordenados = ordenarPlanes(planes)
  const claves = clavesDeFunciones(ordenados)
  /*
    El destacado es el del medio cuando hay tres, que es el que la tabla de precios
    empuja siempre. Con uno o dos no se destaca ninguno: destacar el único es ruido.
  */
  const destacado = ordenados.length >= 3 ? 1 : -1

  return (
    <div className="grid gap-5 md:grid-cols-3">
      {ordenados.map((plan, i) => (
        <TarjetaPlan
          key={plan.code}
          plan={plan}
          planes={ordenados}
          claves={claves}
          destacado={i === destacado}
          onElegir={() => cola?.encolar({ name: 'cta_clicked', section: 'pricing', action: 'signup' })}
        />
      ))}
    </div>
  )
}
