import { BellRing, CheckCircle2, ReceiptText } from 'lucide-react'
import { SectionHeading } from './section-heading'
import type { Cola } from './signals'
import { useReveal } from './use-reveal'
import { useSectionViewed } from './use-section-viewed'

/**
 * «Del movimiento a la acción»: los tres pasos que ocurren solos.
 *
 * Sección oscura, así que sus tintas salen del shell y no del modo: `--sidebar-*` va oscuro
 * en los dos temas por definición (§3.2), que es justo lo que necesita una banda oscura
 * dentro de una página clara.
 *
 * **Los iconos van en pastilla tintada, y aquí sí se puede.** §11.1 (2) lo prohíbe en la
 * consola —donde repetirlo en cada fila es el patrón de plantilla por excelencia— y §97.1
 * lo permite en pasos numerados de la portada, que es exactamente esto: tres, contados, y
 * la superficie es lo que sostiene la secuencia.
 *
 * Único gesto: se encienden en secuencia.
 */

const PASOS = [
  { n: '01', Icon: ReceiptText, tono: 'bg-success/20 text-success', titulo: 'Cobro creado', pie: 'Cliente · Mensualidad' },
  { n: '02', Icon: BellRing, tono: 'bg-success/20 text-success', titulo: 'Recordatorio enviado', pie: 'Automático · hace 2 min' },
  { n: '03', Icon: CheckCircle2, tono: 'bg-primary/25 text-primary', titulo: 'Pago confirmado', pie: 'Banco conectado' },
] as const

export function AutomationSection({ cola }: { cola: Cola | null }) {
  const refSeccion = useSectionViewed(cola, 'automation')
  const refPasos = useReveal<HTMLOListElement>()

  return (
    <section ref={refSeccion} className="bg-sidebar px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="gap-10 lg:flex lg:items-end lg:justify-between">
          <SectionHeading
            claro
            rotulo="Las cosas pasan solas"
            principal="Del movimiento"
            secundaria="a la acción."
          />
          <p className="mt-6 max-w-sm text-base leading-relaxed text-sidebar-muted-foreground lg:mt-0">
            Nummo convierte cada evento en el siguiente paso. Sin perseguir pendientes. Sin
            trabajo duplicado.
          </p>
        </div>

        <ol ref={refPasos} className="mt-16 grid gap-10 md:grid-cols-3">
          {PASOS.map(({ n, Icon, tono, titulo, pie }, i) => (
            <li
              key={n}
              data-revelar
              style={{ ['--paso' as string]: `${i * 160}ms` }}
              className="relative flex items-start gap-4"
            >
              {/*
                La línea que une los pasos. Decorativa y solo en escritorio: apilados en
                móvil, una línea horizontal entre ellos no uniría nada.
              */}
              {i < PASOS.length - 1 && (
                <span
                  className="absolute left-16 right-[-2.5rem] top-6 hidden h-px bg-sidebar-border md:block"
                  aria-hidden
                />
              )}
              <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${tono}`} aria-hidden>
                <Icon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs text-sidebar-muted-foreground tabular-nums">{n}</span>
                <span className="mt-1 block text-base font-semibold text-sidebar-foreground">
                  {titulo}
                </span>
                <span className="mt-0.5 block text-sm text-sidebar-muted-foreground">{pie}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
