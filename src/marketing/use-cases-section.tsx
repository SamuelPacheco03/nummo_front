import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SectionHeading } from './section-heading'
import type { Cola } from './signals'
import { useReveal } from './use-reveal'
import { useSectionViewed } from './use-section-viewed'

/**
 * «Un sistema que se adapta a ti»: tres formas de usarlo.
 *
 * Único gesto: las tarjetas se revelan escalonadas y la activa levanta. **Una sola** va
 * rellena — si las tres destacaran, ninguna destacaría (§11.1 (4)).
 */

const CASOS = [
  {
    n: '01',
    titulo: ['Negocios', 'que crecen.'],
    cuerpo: 'Más visión para tomar decisiones cuando todo empieza a moverse más rápido.',
    activo: true,
  },
  {
    n: '02',
    titulo: ['Servicios', 'con ritmo.'],
    cuerpo: 'Cobra a tiempo y cuida cada relación.',
    activo: false,
  },
  {
    n: '03',
    titulo: ['Tu vida,', 'más simple.'],
    cuerpo: 'También para ordenar lo tuyo.',
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
          rotulo="Hecho para tu forma de moverte"
          principal="Un sistema que"
          secundaria="se adapta a ti."
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
