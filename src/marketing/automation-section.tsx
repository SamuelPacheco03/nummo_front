import { Check } from 'lucide-react'
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

/**
 * Lo que a nadie se le ocurre preguntar hasta que ya firmó, contestado antes.
 *
 * Las cuatro salen del contrato, no de un folleto: la política de cobranza corre antes y
 * después del vencimiento, `overdueSummaryTemplateKey` agrupa lo que debe cada persona en
 * un aviso, las horas de silencio de la organización son una ventana fuera de la cual no
 * se escribe a nadie, y `interest-policies` + `accrue-interest` causan la mora.
 */
const GARANTIAS = [
  'Antes y después del vencimiento',
  'Un mensaje por persona, no uno por factura',
  'Nunca fuera de horario',
  'La mora, calculada',
] as const

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
            rotulo="Cobranza que no tienes que hacer"
            principal="Deja de perseguir"
            secundaria="a quien te debe."
          />
          {/*
            Aquí es donde la cobranza pega con todo, y por eso el hero no la vende (§97.22):
            la portada promete saber cómo vas, y esta sección es la prueba de que además
            actúa.

            Cada frase es una capacidad distinta de `HANDOFF-whatsapp-cobranza.md`:
            `dueSoon`/`overdue`, plantillas aprobadas por Meta más las horas de silencio,
            `overdueSummaryTemplateKey` —que existe porque Meta no pluraliza y un deudor
            recibe UN aviso con todo lo que debe—, e `interest-policies`.
          */}
          <p className="mt-6 max-w-md text-base leading-relaxed text-sidebar-muted-foreground lg:mt-0">
            Nummo sabe quién está por vencer y quién ya venció. Escribe por{' '}
            <strong className="font-semibold text-sidebar-foreground">WhatsApp</strong>, con tu
            plantilla y en tu horario. Un solo mensaje por persona, con todo lo que debe. Y si
            hay mora, la calcula.
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

        {/*
          Las cuatro objeciones de quien duda en automatizar cobros —«¿va a spamear a mis
          clientes?», «¿va a escribir a medianoche?», «¿me toca calcular intereses?»—
          respondidas antes de que las haga. Es lo que separa una sección bonita de una que
          vende, y por eso esta es la única que añade maquetación.

          Van como lista y no como párrafo porque se leen de un barrido: cuatro anclas, no
          una frase que hay que terminar.
        */}
        <ul className="mt-14 grid gap-4 border-t border-sidebar-border pt-8 sm:grid-cols-2 lg:grid-cols-4">
          {GARANTIAS.map((texto) => (
            <li key={texto} className="flex items-start gap-2.5">
              <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-sidebar-primary" />
              <span className="text-sm leading-relaxed text-sidebar-muted-foreground">{texto}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
