import { FileText, MessageCircle, Wallet } from 'lucide-react'
import { formatMoney } from '@/lib/format'
import { SectionHeading } from './section-heading'
import { useReveal } from './use-reveal'

/**
 * «El desorden cuesta»: la factura, no la metáfora.
 *
 * **Ya no lleva `id`.** Tenía `producto`, y el navegador enlazaba ahí bajo esa palabra —
 * o sea que «Producto» te llevaba a la sección del *problema*. El enlace apunta ahora al
 * gráfico (`#demo`) y aquí no queda ancla, porque nadie la enlaza.
 *
 * **Aquí había un antes/después y se fue.** Dos paneles: a la izquierda tres pastillas
 * flotando sobre gris —una recreación del desorden que se leía como una pantalla a medio
 * hacer— y a la derecha dos barras de progreso que decían menos que el gráfico de la
 * sección siguiente. El rótulo prometía que el desorden **cuesta** y el dibujo no enseñaba
 * ningún costo en ninguna parte.
 *
 * Lo sustituye una sola tarjeta: **cada cosa suelta con lo que costó al lado**. Es lo que
 * la sección venía diciendo con palabras desde que existe.
 *
 * Y el «después» sobra: la sección de al lado —el gráfico— *es* el después, y enseñarlo
 * aquí en barras era contarlo dos veces y peor la primera.
 *
 * Único gesto: las filas entran escalonadas, como el resto de la página.
 */

/**
 * Lo que se pierde y lo que vale perderlo.
 *
 * Cifras de ejemplo, como las del panel del hero, y pasan por `formatMoney` para que un
 * peso se escriba igual en toda la app (§88). El remate no es una fila más: es el hallazgo
 * de la sección, y por eso vive fuera de la lista y detrás de una línea.
 */
const COSTOS = [
  {
    Icon: FileText,
    que: 'Factura #048, vencida hace 34 días',
    cuesta: `${formatMoney('2400000.00')} sin entrar`,
    enPlata: true,
  },
  {
    Icon: Wallet,
    que: 'El pago de marzo, sin registrar',
    cuesta: 'El mes no cuadra',
    enPlata: false,
  },
  {
    Icon: MessageCircle,
    que: '«¿Ya me consignaste?»',
    cuesta: 'La tercera vez que preguntas',
    enPlata: false,
  },
] as const

export function DisorderSection() {
  const ref = useReveal<HTMLDivElement>()

  return (
    <section className="bg-background px-6 py-24">
      <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-2 lg:items-center">
        <div>
          <SectionHeading
            rotulo="El desorden cuesta"
            principal="El problema no es que falte plata."
            secundaria="Es que no sabes dónde está."
          />
          <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
            Una cuenta que se te pasó son treinta días sin ese dinero. Un gasto que no anotaste
            es un mes que no cuadra. El desorden no es incomodidad: es plata.
          </p>
        </div>

        <div ref={ref} className="rounded-2xl bg-sidebar p-6 sm:p-8">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-sidebar-muted-foreground">
            Lo que te está costando
          </p>

          <ul className="mt-7 space-y-6">
            {COSTOS.map(({ Icon, que, cuesta, enPlata }, i) => (
              <li
                key={que}
                data-revelar
                style={{ ['--paso' as string]: `${i * 130}ms` }}
                className="flex items-start gap-3.5"
              >
                {/*
                  **El rojo va en el icono, no en la cifra**, y no es una preferencia: en
                  claro `--destructive-strong` sobre el shell da 3.70:1, por debajo de AA
                  para texto. Ese token está afinado contra `--card`, que es claro, y el
                  shell va oscuro en los DOS modos (§3.2).

                  Como icono sí vale: la 1.4.11 pide 3:1 a lo no textual y da 3.70. Así que
                  la señal de pérdida se queda y la cifra se destaca con peso, que sobre
                  esta superficie rinde 17:1. Antes de tintar aquí cualquier otra cosa, hay
                  que medirla — `tokens.test.ts` ya vigila este par.
                */}
                <Icon
                  aria-hidden
                  className={`mt-0.5 size-4 shrink-0 ${
                    enPlata ? 'text-destructive-strong' : 'text-sidebar-muted-foreground'
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-sidebar-foreground">{que}</span>
                  <span className="mt-1 block text-sm font-semibold text-sidebar-foreground">
                    {cuesta}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-7 border-t border-sidebar-border pt-6 text-base font-semibold text-sidebar-foreground">
            Y nada de esto te avisó.
          </p>
        </div>
      </div>
    </section>
  )
}
