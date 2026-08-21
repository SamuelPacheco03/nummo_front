import { ArrowRight, ArrowUpRight, BellRing, CheckCircle2, Play, ReceiptText, Sparkles } from 'lucide-react'
import { RowIconBadge, type RowIconTone } from '@/components/ui/row-icon'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/format'
import { SERIF_STACK } from './type'

/**
 * El hero de la portada, maquetado contra los mockups.
 *
 * El gesto de firma que se repite en toda la página empieza aquí: **titular a dos tonos**,
 * la primera parte en tinta y la destacada en **serif cursiva** sobre `--heading-muted`.
 * Ese token existe aparte de `--muted-foreground` porque vive en el umbral de texto grande
 * (§97.6); usarlo para un párrafo lo deja por debajo de AA.
 *
 * La acción principal va en durazno (`--primary`) con tinta oscura encima. La tinta no se
 * declara: `inkOnFill` la elige, y sobre el durazno elige la oscura porque el blanco daría
 * 1.9:1. Ponerle `text-white` a mano es exactamente el error que la capa evita.
 *
 * Un solo gesto en movimiento: la entrada escalonada. El panel entra con inclinación
 * mínima y el aviso de Numi con retardo.
 */

/** Una fila de «Actividad reciente» del panel de muestra. */
interface Actividad {
  Icon: typeof ReceiptText
  tone: RowIconTone
  titulo: string
  detalle: string
}

const ACTIVIDAD: readonly Actividad[] = [
  { Icon: ReceiptText, tone: 'success', titulo: 'Cobro creado', detalle: 'Cliente · Mensualidad' },
  { Icon: BellRing, tone: 'brand', titulo: 'Recordatorio enviado', detalle: 'Automático · hace 2 min' },
  { Icon: CheckCircle2, tone: 'success', titulo: 'Pago confirmado', detalle: 'Banco conectado' },
]

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

export function Hero({ className }: { className?: string }) {
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
            Nummo conecta cobros, pagos y movimientos en una sola experiencia. Menos dispersión.
            Más control para decidir mejor.
          </p>

          <div
            className="animate-hero-in mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6"
            style={paso(230)}
          >
            <a
              href="/register"
              className="inline-flex h-12 min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              Empezar ahora
              <ArrowRight className="size-4" aria-hidden />
            </a>
            <a
              href="#demo"
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
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            {/* Cromo de ventana: es lo que dice «esto es la app» sin escribirlo. */}
            <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
              <span className="flex gap-1.5" aria-hidden>
                <span className="size-2 rounded-full bg-muted-foreground/25" />
                <span className="size-2 rounded-full bg-muted-foreground/25" />
                <span className="size-2 rounded-full bg-muted-foreground/25" />
              </span>
              <span className="text-xs text-muted-foreground">Mi operación · Hoy</span>
            </div>

            {/* El `pb` extra no es aire: es donde se apoya el aviso de Numi sin tapar una fila. */}
            <div className="p-5 pb-16">
              <p className="text-xs text-muted-foreground">Resumen financiero</p>
              <p className="mt-1 flex items-center gap-1.5 text-lg font-semibold tracking-tight text-foreground">
                Buen día, Andrea
                <Sparkles className="size-4 text-primary" aria-hidden />
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="min-w-0 rounded-xl bg-success/15 p-4">
                  <p className="text-[0.6875rem] text-muted-foreground">Disponible</p>
                  <p className="mt-1 text-xl font-semibold tracking-tight text-foreground tabular-nums">
                    {formatMoney('24680000.00')}
                  </p>
                  <p className="mt-1 text-[0.6875rem] text-success-strong">↗ 12,8% este mes</p>
                </div>
                <div className="min-w-0 rounded-xl border border-border p-4">
                  <p className="text-[0.6875rem] text-muted-foreground">Por cobrar</p>
                  <p className="mt-1 text-xl font-semibold tracking-tight text-foreground tabular-nums">
                    {formatMoney('8420000.00')}
                  </p>
                  <p className="mt-1 text-[0.6875rem] text-warning-strong">6 pendientes</p>
                </div>
              </div>

              <div className="mt-5 flex items-baseline justify-between">
                <p className="text-xs text-muted-foreground">Actividad reciente</p>
                <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                  Ver todo
                  <ArrowUpRight className="size-3" aria-hidden />
                </span>
              </div>

              <ul className="mt-3 space-y-3">
                {ACTIVIDAD.map((a) => (
                  <li key={a.titulo} className="flex items-center gap-3">
                    {/* La pastilla de la consola, no una imitación (§94). */}
                    <RowIconBadge Icon={a.Icon} tone={a.tone} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {a.titulo}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">{a.detalle}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">Hoy</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* El aviso de Numi llega el último, y por eso se nota. */}
          <div
            className="animate-hero-in absolute -bottom-6 -left-3 flex max-w-[19rem] items-start gap-2.5 rounded-xl bg-sidebar px-4 py-3 shadow-sm sm:-left-8"
            style={paso(620)}
          >
            <Sparkles className="mt-0.5 size-4 shrink-0 text-sidebar-primary" aria-hidden />
            <span className="min-w-0">
              <span className="block text-[0.6875rem] text-sidebar-muted-foreground">Numi dice</span>
              <span className="block text-sm leading-snug text-sidebar-foreground">
                Tu flujo está 18% más saludable que el mes pasado.
              </span>
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
