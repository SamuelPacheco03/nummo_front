import { ArrowRight, Play } from 'lucide-react'
import { AppPreview, NumiNotice } from './app-preview'
import { cn } from '@/lib/utils'
import { SERIF_STACK } from './type'
import { rutasApp } from './links'
import type { Cola } from './signals'

/**
 * El hero de la portada, maquetado contra los mockups.
 *
 * El gesto de firma que se repite en toda la página empieza aquí: **titular a dos tonos**,
 * la primera parte en tinta y la destacada en **serif cursiva** sobre `--heading-muted`.
 * Ese token existe aparte de `--muted-foreground` porque vive en el umbral de texto grande
 * (§97.6); usarlo para un párrafo lo deja por debajo de AA.
 *
 * La acción principal va en `--cta`, que no es `--primary`: `--primary` es el color de
 * acción del sistema —el que la consola no puede mover— y esto es «con qué se pinta el
 * botón que queremos que pulsen», que cambia por paleta y por modo (§97.14).
 *
 * La tinta de encima **no se declara**: `inkOnFill` la elige. Sobre el navy sale blanca;
 * sobre el durazno de los mockups sale oscura, porque el blanco ahí daría 1.9:1. Ponerle
 * `text-white` a mano es exactamente el error que la capa evita.
 *
 * Un solo gesto en movimiento: la entrada escalonada. El panel entra con inclinación
 * mínima y el aviso de Numi con retardo.
 */

/** Las tres iniciales de la prueba social. No son personas reales: no hay clientes que citar. */
const CARAS = ['J', 'M', 'A'] as const

/**
 * El retardo de cada pieza en la entrada escalonada.
 *
 * Va como estilo en línea y no como clase porque son valores de una secuencia, no una
 * escala: lo que importa es el orden, y se lee mejor junto que repartido en seis
 * utilidades.
 */
function paso(ms: number): React.CSSProperties {
  return { animationDelay: `${ms}ms` }
}

export function Hero({ className, cola }: { className?: string; cola?: Cola | null }) {
  return (
    <section className={cn('relative overflow-hidden bg-background px-6 py-20 sm:py-28', className)}>
      <div className="mx-auto grid max-w-6xl gap-16 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-14">
        <div>
          {/*
            §11.1 (3) prohíbe las versalitas en la consola; §97.1 las permite en la portada
            a razón de UNA por sección, como rótulo que orienta la lectura. Esta es la suya.
          */}
          <p
            className="animate-hero-in flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
            style={paso(0)}
          >
            <span className="size-1.5 rounded-full bg-primary" aria-hidden />
            La claridad que mueve tu negocio
          </p>

          <h1
            className="animate-hero-in mt-6 text-balance text-[2.75rem] font-semibold leading-[1.02] tracking-tight text-foreground sm:text-6xl"
            style={paso(90)}
          >
            Tus finanzas,{' '}
            {/* `em` ya va en cursiva: aquí solo cambian la familia y el tono. */}
            <em className="font-normal text-heading-muted" style={{ fontFamily: SERIF_STACK }}>
              por fin
            </em>{' '}
            en orden.
          </h1>

          <p
            className="animate-hero-in mt-6 max-w-md text-lg leading-relaxed text-muted-foreground"
            style={paso(160)}
          >
            Nummo reúne cobros, pagos y movimientos en una sola experiencia. Menos dispersión.
            Más control para decidir mejor.
          </p>

          <div
            className="animate-hero-in mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6"
            style={paso(230)}
          >
            {/*
              El botón principal de la portada **no emitía nada**. Los `cta_clicked` de
              `hero`/`signup` que llegaban eran los del navegador de arriba, que se atribuye
              a esta sección: el embudo contaba las pulsaciones de la barra y ninguna de las
              del hero.
            */}
            <a
              href={rutasApp.registro}
              onClick={() => cola?.encolar({ name: 'cta_clicked', section: 'hero', action: 'signup' })}
              className="inline-flex h-12 min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-cta px-6 text-sm font-semibold text-cta-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              Empezar ahora
              <ArrowRight className="size-4" aria-hidden />
            </a>
            {/* `action: 'demo'` existe en el catálogo de señales para exactamente esto. */}
            <a
              href="#demo"
              onClick={() => cola?.encolar({ name: 'cta_clicked', section: 'hero', action: 'demo' })}
              className="inline-flex min-w-0 items-center gap-2.5 whitespace-nowrap rounded-full text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full border border-border">
                <Play className="size-3.5 fill-current" aria-hidden />
              </span>
              Ver cómo funciona
            </a>
          </div>

          <div className="animate-hero-in mt-12 flex items-center gap-3" style={paso(300)}>
            <span className="flex -space-x-2" aria-hidden>
              {CARAS.map((letra, i) => (
                <span
                  key={letra}
                  className={cn(
                    'grid size-7 place-items-center rounded-full border-2 border-background text-[0.625rem] font-semibold',
                    ['bg-success text-success-foreground', 'bg-chat-bubble text-chat-bubble-foreground', 'bg-primary text-primary-foreground'][i],
                  )}
                >
                  {letra}
                </span>
              ))}
            </span>
            <p className="text-sm text-muted-foreground">
              Creado para quienes hacen que las cosas pasen
            </p>
          </div>
        </div>

        {/*
          El panel entra con inclinación mínima: lo justo para que se lea como una captura
          apoyada y no como una tarjeta más. Más grados y empieza a parecer una plantilla.
        */}
        <div className="animate-hero-panel relative" style={paso(180)}>
          <AppPreview huecoParaAviso />

          {/*
            El aviso de Numi llega el último, y por eso se nota.

            El anillo no es adorno: la tarjeta va en el tono del shell, que es oscuro en los
            DOS modos. Sobre una página clara resalta sola; sobre una oscura se fundía con el
            fondo y el aviso desaparecía. El borde es lo que le devuelve el filo.
          */}
          <NumiNotice
            className="animate-hero-in absolute -bottom-6 -left-3 sm:-left-8"
            style={paso(620)}
          />
        </div>
      </div>
    </section>
  )
}
