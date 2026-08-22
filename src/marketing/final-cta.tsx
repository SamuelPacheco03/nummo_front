import { ArrowRight } from 'lucide-react'
import { SERIF_STACK } from './type'
import type { Cola } from './signals'
import { useReveal } from './use-reveal'
import { useSectionViewed } from './use-section-viewed'
import { rutasApp } from './links'

/**
 * El cierre: el titular grande con la elipse detrás y la última llamada a la acción.
 *
 * Único gesto: **la elipse se dibuja** al entrar, con el mismo mecanismo que la línea del
 * gráfico (`stroke-dasharray` + `data-dibujar`). Va detrás del texto y `aria-hidden`: es un
 * subrayado, no información.
 *
 * La segunda línea va en serif cursiva sobre `--heading-muted`, cerrando el gesto que abrió
 * el hero — el mismo con el que empieza la página termina la página.
 *
 * **Y el texto cierra lo que el hero abrió.** Decía «Menos desorden. Más movimiento» sobre
 * «empieza a ver tus finanzas de otra forma»: tres frases de atmósfera pura, y las dos
 * palabras del titular eran justo las que se limpiaron del resto de la portada (§97.22).
 * Ahora repite la promesa del hero con las palabras del final —los números ya existen, lo
 * que falta es quien los mire— y remata quitando la última objeción que le queda a quien
 * llegó hasta aquí: cuánto cuesta empezar.
 *
 * «Tres campos» no es una manera de hablar: `RegisterInput` pide correo, contraseña y
 * nombre, y nada más. Si algún día pide un cuarto, esta frase deja de ser verdad.
 */
export function FinalCta({ cola }: { cola: Cola | null }) {
  const refSeccion = useSectionViewed(cola, 'final_cta')
  const refBloque = useReveal<HTMLDivElement>()

  return (
    /*
      `overflow-hidden` por la elipse: mide 112% del bloque para leerse como un trazo hecho
      encima y no como un marco, y sin recortar empujaba el ancho del documento 19 px en
      pantallas medianas. Es decorativa, así que recortarle las puntas no le quita nada.
    */
    <section ref={refSeccion} className="overflow-hidden bg-secondary px-6 py-28">
      <div ref={refBloque} data-revelar className="relative mx-auto max-w-3xl text-center">
        {/*
          La elipse: trazo fino, sin relleno, y deliberadamente descentrada respecto al
          bloque para que se lea como algo dibujado a mano encima y no como un marco.
        */}
        <svg
          viewBox="0 0 600 220"
          className="pointer-events-none absolute left-1/2 top-1/2 h-[130%] w-[112%] -translate-x-1/2 -translate-y-[54%]"
          aria-hidden
          preserveAspectRatio="none"
        >
          <ellipse
            cx="300"
            cy="110"
            rx="292"
            ry="104"
            fill="none"
            stroke="var(--heading-muted)"
            strokeOpacity="0.45"
            strokeWidth="1.5"
            transform="rotate(-2 300 110)"
            data-dibujar
            style={{ ['--largo' as string]: 1300 }}
          />
        </svg>

        <div className="relative">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Lo que sigue
          </p>

          <h2 className="mt-6 text-balance text-[2.5rem] font-semibold leading-[1.04] tracking-tight text-foreground sm:text-6xl">
            <span className="block">Tus números ya están ahí.</span>
            <span
              className="block font-normal text-heading-muted"
              style={{ fontFamily: SERIF_STACK, fontStyle: 'italic' }}
            >
              Solo falta quien los mire.
            </span>
          </h2>

          <p className="mt-6 text-base text-muted-foreground">
            Tres campos y estás dentro.
          </p>

          <a
            href={rutasApp.registro}
            onClick={() =>
              cola?.encolar({ name: 'cta_clicked', section: 'final_cta', action: 'signup' })
            }
            className="mt-8 inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-full bg-cta px-7 text-sm font-semibold text-cta-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            Probar Nummo
            <ArrowRight className="size-4" aria-hidden />
          </a>
        </div>
      </div>
    </section>
  )
}
