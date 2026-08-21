import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import type { LandingEventInput } from '@/api/generated/model'
import { cn } from '@/lib/utils'
import { trazar } from './chart-path'
import { SectionHeading } from './section-heading'
import type { Cola } from './signals'
import { useReveal } from './use-reveal'
import { useSectionViewed } from './use-section-viewed'

/**
 * «Tu dinero tiene un ritmo»: la vista viva de lo que entra y sale.
 *
 * Único gesto: la línea del área **se dibuja** al entrar. Las pestañas cruzan series, que
 * es lo que enseña que la misma vista contesta tres preguntas distintas.
 */

type TabCatalogo = Extract<LandingEventInput, { name: 'demo_tab_selected' }>['tab']

interface Vista {
  id: string
  etiqueta: string
  serie: readonly number[]
  /**
   * El nombre del catálogo cerrado, si esta pestaña tiene uno.
   *
   * «Pagos» no lo tiene: el catálogo (`collections · finances · numi · whatsapp · reports`)
   * se fijó antes de que la página existiera, igual que pasó con las secciones. Se pide al
   * backend antes que mandar `finances` para «Pagos», que mediría una cosa llamándola otra.
   */
  tab: TabCatalogo | null
}

const VISTAS: readonly Vista[] = [
  { id: 'todo', etiqueta: 'Todo', serie: [8, 14, 11, 19, 16, 27, 24, 22, 31, 29, 34, 33], tab: 'finances' },
  { id: 'cobros', etiqueta: 'Cobros', serie: [5, 9, 8, 15, 14, 21, 19, 20, 26, 25, 30, 31], tab: 'collections' },
  { id: 'pagos', etiqueta: 'Pagos', serie: [3, 5, 4, 7, 6, 9, 8, 7, 10, 9, 11, 10], tab: null },
]

const ANCHO = 760
const ALTO = 240
const ESCALA = ['$40M', '$30M', '$20M', '$10M', '$0'] as const

export function RhythmSection({ cola }: { cola: Cola | null }) {
  const refSeccion = useSectionViewed(cola, 'product_demo')
  const refGrafico = useReveal<HTMLDivElement>()
  const [activa, setActiva] = useState(VISTAS[0])

  const { linea, area, largo } = trazar(activa.serie, ANCHO, ALTO)

  function elegir(vista: Vista) {
    setActiva(vista)
    if (vista.tab) cola?.encolar({ name: 'demo_tab_selected', tab: vista.tab })
  }

  return (
    /* La banda salvia: la superficie hundida de la candidata, no un gris inventado. */
    <section ref={refSeccion} className="bg-secondary px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="gap-10 lg:flex lg:items-end lg:justify-between">
          <SectionHeading
            rotulo="Una nueva forma de operar"
            principal="Tu dinero tiene"
            secundaria="un ritmo. Nummo lo entiende."
          />
          <p className="mt-6 max-w-sm text-base leading-relaxed text-muted-foreground lg:mt-0">
            Una vista viva de lo que entra, sale y necesita tu atención. Diseñada para que el
            control se sienta natural.
          </p>
        </div>

        <div ref={refGrafico} data-revelar className="mt-12 rounded-2xl bg-card p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Movimientos</p>
              <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                Todo en movimiento
              </p>
            </div>

            {/* Segmentado: la pastilla oscura marca la activa, como en la consola. */}
            <div className="flex gap-1 rounded-full bg-muted p-1" role="tablist">
              {VISTAS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  role="tab"
                  aria-selected={v.id === activa.id}
                  onClick={() => elegir(v)}
                  className={cn(
                    'rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    v.id === activa.id
                      ? 'bg-sidebar text-sidebar-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {v.etiqueta}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 flex gap-4">
            <div className="flex shrink-0 flex-col justify-between py-1 text-[0.6875rem] text-muted-foreground tabular-nums">
              {ESCALA.map((e) => (
                <span key={e}>{e}</span>
              ))}
            </div>

            <div className="relative min-w-0 flex-1">
              <svg
                viewBox={`0 0 ${ANCHO} ${ALTO}`}
                className="h-48 w-full sm:h-60"
                preserveAspectRatio="none"
                role="img"
                aria-label={`Evolución de ${activa.etiqueta.toLowerCase()} en los últimos treinta días`}
              >
                {/* Rejilla: cuatro líneas y punteadas, que no compitan con el dato. */}
                {[0, 1, 2, 3].map((i) => (
                  <line
                    key={i}
                    x1="0"
                    x2={ANCHO}
                    y1={(ALTO / 4) * i}
                    y2={(ALTO / 4) * i}
                    stroke="var(--border)"
                    strokeDasharray="4 6"
                    strokeWidth="1"
                  />
                ))}
                <path d={area} fill="var(--success)" fillOpacity="0.22" />
                <path
                  d={linea}
                  fill="none"
                  stroke="var(--success-strong)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  data-dibujar
                  style={{ ['--largo' as string]: largo }}
                />
              </svg>

              {/* El globo del mockup, en su sitio: lo que la consola enseña al pasar por encima. */}
              <span className="pointer-events-none absolute left-[42%] top-2 rounded-lg bg-sidebar px-3 py-2 text-center shadow-sm">
                <span className="block text-[0.625rem] text-sidebar-muted-foreground">Jul 24</span>
                <span className="block text-sm font-semibold text-sidebar-foreground tabular-nums">
                  $32,48M
                </span>
                {/*
                  `success` y no `success-strong`: el globo va sobre el shell, que es oscuro
                  en los dos modos, y `success-strong` es el tono pensado para LEERSE SOBRE
                  CLARO — aquí desaparecía. El de relleno es el claro, y es el que se lee.
                */}
                <span className="block text-[0.625rem] text-success tabular-nums">↑ 19,2%</span>
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
            <span className="flex items-center gap-5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-success" aria-hidden />
                Ingresos
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-primary" aria-hidden />
                Egresos
              </span>
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              Últimos 30 días
              <ArrowUpRight className="size-3" aria-hidden />
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
