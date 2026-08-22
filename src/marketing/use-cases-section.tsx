import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SectionHeading } from './section-heading'
import type { Cola } from './signals'
import { useReveal } from './use-reveal'
import { useSectionViewed } from './use-section-viewed'

/**
 * «Si algo de esto te suena, es para ti»: los tres casos reales.
 *
 * Era la sección más vacía de la portada. Decía «Negocios que crecen — más visión para
 * tomar decisiones cuando todo empieza a moverse más rápido»: catorce palabras y ninguna
 * información. Y «Tu vida, más simple — también para ordenar lo tuyo» sonaba a que nadie
 * sabía para qué servía ese tercer caso.
 *
 * Ahora cada tarjeta **abre nombrando a quién** —para que el lector se reconozca en dos
 * segundos— y **cierra en el premio**, no enumerando lo que hace el sistema. Ese es el
 * cambio de patrón: «tú solo revisas» vende, «Nummo genera, calcula y manda» describe.
 *
 * Los tres salen del producto, no de un buyer persona:
 *
 * 1. `billing-agreements` + `receivables/generate` + `interest-policies` — la cuenta del
 *    mes que se repite, con su mora. Es para lo que está construido antes que nada: la
 *    semilla de demo del backend es un jardín infantil.
 * 2. Cartera y egresos a la vez, que son ~24 y ~19 rutas del contrato. El negocio que
 *    mira los dos lados.
 * 3. `expense-schedules` en `AUTO_RECORD`, que el handoff de la fase 10 explica con el
 *    ejemplo de Netflix debitando la tarjeta. Es la función más «finanzas personales» que
 *    tiene Nummo y no la mencionaba nadie.
 *
 * El que se cayó fue «ya no cabes en una hoja de cálculo»: es una **etapa**, no una
 * audiencia, y se solapaba con las otras dos.
 *
 * Único gesto: las tarjetas se revelan escalonadas y la activa levanta. **Una sola** va
 * rellena — si las tres destacaran, ninguna destacaría (§11.1 (4)).
 */

const CASOS = [
  {
    n: '01',
    titulo: ['Cobras lo mismo', 'cada mes.'],
    cuerpo:
      'Colegios, gimnasios, arriendos. Las cuentas del mes se generan solas, la mora se calcula sola y los recordatorios salen solos. Tú solo revisas.',
    activo: true,
  },
  {
    n: '02',
    titulo: ['Llevas un negocio', 'y sus cuentas.'],
    cuerpo:
      'Agencias, tiendas, consultorios. Sabes quién te debe, qué te toca pagar y cuánto te queda de verdad. Sin abrir cinco archivos.',
    activo: false,
  },
  {
    n: '03',
    titulo: ['Es lo tuyo,', 'no un negocio.'],
    cuerpo:
      'Netflix, el arriendo y la cuota del carro se registran solos. Tú ves a dónde se te fue el mes — y si te deben, también aparece.',
    activo: false,
  },
] as const

export function UseCasesSection({ cola }: { cola: Cola | null }) {
  const refSeccion = useSectionViewed(cola, 'use_cases')
  const refTarjetas = useReveal<HTMLDivElement>()

  return (
    <section ref={refSeccion} id="para-quien" className="bg-background px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          rotulo="Para quién es"
          principal="Si algo de esto te suena,"
          secundaria="es para ti."
        />

        <div ref={refTarjetas} className="mt-14 grid gap-5 md:grid-cols-3">
          {CASOS.map(({ n, titulo, cuerpo, activo }, i) => (
            <article
              key={n}
              data-revelar
              style={{ ['--paso' as string]: `${i * 120}ms` }}
              className={cn(
                'flex min-h-[17rem] min-w-0 flex-col rounded-2xl p-6 transition-transform duration-300 hover:-translate-y-1',
                activo ? 'bg-chat-bubble' : 'border border-border bg-card',
              )}
            >
              <p className="text-xs text-muted-foreground tabular-nums">{n}</p>
              <h3 className="mt-8 text-2xl font-semibold leading-tight tracking-tight text-foreground">
                <span className="block">{titulo[0]}</span>
                <span className="block">{titulo[1]}</span>
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{cuerpo}</p>
              <ArrowUpRight className="mt-auto size-5 self-end text-muted-foreground" aria-hidden />
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
