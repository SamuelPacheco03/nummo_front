import { ArrowRight, RefreshCw } from 'lucide-react'
import { getApiV1PublicPricing } from '@/api/generated/endpoints/public/public'
import type { PricingPlan } from '@/api/generated/model'
import { PlanCard } from '@/components/plan-card'
import { SectionHeading } from './section-heading'
import { clavesDeFunciones, etiquetaDeFuncion, incluye, leerPrecio, leerTope, ordenarPlanes } from './pricing'
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
    **El «Recomendado» lo decide la página, no el contrato**, y conviene saberlo: el API no
    publica esa señal, así que esto es una decisión de precio escrita en el front. La
    consola, que negocia planes, se niega a hacerlo por eso mismo (§70) — aquí se acepta
    porque una portada elige a qué plan empuja, y eso es marketing, no un dato.

    Se destaca **el último**, que es el más capaz. La primera versión destacaba el del
    medio y con los planes reales eso ponía «Recomendado» sobre el único que ni siquiera
    tiene tarifa publicada. Con menos de tres no se destaca ninguno: destacar el único es
    ruido.
  */
  const destacado = ordenados.length >= 3 ? ordenados.length - 1 : -1

  return (
    <div className="grid items-stretch gap-6 md:grid-cols-3">
      {ordenados.map((plan, i) => {
        const { texto, consultar } = leerPrecio(plan.price)
        return (
          <PlanCard
            key={plan.code}
            nombre={plan.name}
            codigo={plan.code}
            precio={consultar ? null : { monto: texto, porMes: Boolean(plan.price && Number(plan.price.amount) > 0) }}
            descripcion={plan.description}
            topes={plan.limits.map((l) => ({ key: l.key, label: l.label, valor: leerTope(l) }))}
            /*
              Una clave que el backend no anuncia para este plan NO se pinta como excluida:
              una fila ausente no dice «no lo tiene», dice «no se sabe».
            */
            funciones={claves
              .map((key) => ({ key, label: etiquetaDeFuncion(ordenados, key), included: incluye(plan, key) }))
              .filter((f): f is { key: string; label: string; included: boolean } => f.included !== undefined)}
            destacado={i === destacado}
            insignia={i === destacado ? { texto: 'Recomendado', tono: 'recomendado' } : null}
            accion={
              <a
                href={rutasApp.registro}
                onClick={() => cola?.encolar({ name: 'cta_clicked', section: 'pricing', action: 'signup' })}
                className={
                  i === destacado
                    ? 'inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-cta px-5 text-sm font-semibold text-cta-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'
                    : 'inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'
                }
              >
                {consultar ? `Consultar ${plan.name}` : 'Empezar'}
                <ArrowRight aria-hidden className="size-4" />
              </a>
            }
          />
        )
      })}
    </div>
  )
}
