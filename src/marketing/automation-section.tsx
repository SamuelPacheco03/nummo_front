import { FLUJO } from './flow'
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

/* El texto sale de `FLUJO`; aquí solo se decide con qué tono se pinta cada cuadro. */
const TONOS = ['bg-success/20 text-success', 'bg-success/20 text-success', 'bg-primary/25 text-primary'] as const

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
          {/*
            Cada afirmación de aquí sale de `contract/HANDOFF-whatsapp-cobranza.md`: los
            recordatorios salen antes y después del vencimiento, un deudor recibe UN aviso
            con todo lo que debe —no uno por factura—, y las horas de silencio de la
            organización son una ventana fuera de la cual no se le escribe a nadie.
          */}
          <p className="mt-6 max-w-sm text-base leading-relaxed text-sidebar-muted-foreground lg:mt-0">
            Nummo convierte cada evento en el siguiente paso. Los recordatorios de cobro salen
            por <strong className="font-semibold text-sidebar-foreground">WhatsApp</strong>{' '}
            antes y después del vencimiento: un solo mensaje por cliente, con todo lo que debe,
            y nunca fuera de horario.
          </p>
        </div>

        <ol ref={refPasos} className="mt-16 grid gap-10 md:grid-cols-3">
          {FLUJO.map(({ Icon, titulo, detalle }, i) => (
            <li
              key={titulo}
              data-revelar
              style={{ ['--paso' as string]: `${i * 160}ms` }}
              className="relative flex items-start gap-4"
            >
              {/*
                La línea que une los pasos. Decorativa y solo en escritorio: apilados en
                móvil, una línea horizontal entre ellos no uniría nada.
              */}
              {i < FLUJO.length - 1 && (
                <span
                  className="absolute left-16 right-[-2.5rem] top-6 hidden h-px bg-sidebar-border md:block"
                  aria-hidden
                />
              )}
              <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${TONOS[i]}`} aria-hidden>
                <Icon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs text-sidebar-muted-foreground tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="mt-1 block text-base font-semibold text-sidebar-foreground">
                  {titulo}
                </span>
                <span className="mt-0.5 block text-sm text-sidebar-muted-foreground">{detalle}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
