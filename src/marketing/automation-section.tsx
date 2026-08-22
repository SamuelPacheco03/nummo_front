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
 *
 * **Están escritas desde el lado del que recibe el mensaje**, no desde el ajuste que las
 * produce: quien duda en automatizar cobros no teme una configuración, teme quedar mal con
 * un cliente. «Un solo mensaje, aunque deba cinco facturas» es el mismo hecho que
 * `overdueSummaryTemplateKey` contado donde duele.
 */
const GARANTIAS = [
  'Avisa antes de vencer, no solo después',
  'Un solo mensaje, aunque deba cinco facturas',
  'Nunca a deshoras',
  'Con los intereses ya calculados',
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

            **El párrafo vende; las garantías tranquilizan.** Hubo una versión donde este
            párrafo enumeraba «con tu plantilla y en tu horario, un solo mensaje por
            persona, y si hay mora la calcula» — o sea, exactamente las cuatro garantías de
            abajo. La sección decía su ficha técnica dos veces y en ningún momento decía por
            qué le importa a quien lee.

            Lo que le importa es que **cobrar es incómodo**, no difícil. Nadie deja de
            perseguir un pago porque le falte una herramienta: deja de hacerlo porque no
            quiere quedar de malo. Eso es lo que va aquí; los hechos, abajo.
          */}
          <p className="mt-6 max-w-md text-base leading-relaxed text-sidebar-muted-foreground lg:mt-0">
            A nadie le gusta cobrar. Toca acordarse, escribir, insistir — y quedar de malo con
            un cliente que te cae bien. Eso lo hace Nummo por ti, por{' '}
            <strong className="font-semibold text-sidebar-foreground">WhatsApp</strong>, a
            tiempo y sin que tengas que pedirlo.
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
