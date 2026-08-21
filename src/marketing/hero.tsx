import { ArrowRight, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/format'
import { SERIF_STACK } from './type'

/**
 * El hero de la portada.
 *
 * **El copy es provisional.** Los mockups no viajaron con el handoff y esto se escribió
 * para que el laboratorio tenga texto de verdad —longitudes reales, cifras con el
 * formateador real de la app— en vez de «Lorem ipsum», que no deja juzgar una tipografía.
 * Se sustituye en cuanto llegue el definitivo; la maqueta no cambia.
 *
 * Lo que el diseño aprobado sí fija y aquí se respeta: fondo de la candidata, titular
 * grande en grotesca apretada con las palabras destacadas en **serif cursiva**, mucho
 * aire, y **un solo gesto** — la entrada escalonada. El panel entra con inclinación
 * mínima y el aviso de Numi con retardo.
 *
 * §11.1 (3) prohíbe las micro-etiquetas en versalitas *en la consola*; §97 las permite
 * en la portada a razón de **una por sección**, y esta es la de esta sección.
 */

/** Una fila del panel de muestra. El dinero llega como string decimal, igual que del API. */
interface FilaMock {
  nombre: string
  detalle: string
  monto: string
  estado: 'al-dia' | 'por-vencer' | 'vencido'
}

const FILAS: readonly FilaMock[] = [
  { nombre: 'Jardín Infantil Semillas', detalle: 'Mensualidad · marzo', monto: '1450000.00', estado: 'vencido' },
  { nombre: 'Panadería La Espiga', detalle: 'Factura 0412', monto: '860000.00', estado: 'por-vencer' },
  { nombre: 'Taller Rueda Libre', detalle: 'Factura 0398', monto: '2310000.00', estado: 'al-dia' },
]

const ESTADO_CLASE: Record<FilaMock['estado'], string> = {
  'al-dia': 'bg-success',
  'por-vencer': 'bg-warning',
  vencido: 'bg-destructive',
}

/**
 * El retardo de cada pieza en la entrada escalonada.
 *
 * Va como variable CSS y no como clase de Tailwind porque son valores de una secuencia,
 * no una escala: lo que importa es el orden en que aparecen las cosas, y eso se lee
 * mejor aquí junto que repartido en seis utilidades.
 */
function paso(ms: number): React.CSSProperties {
  return { animationDelay: `${ms}ms` }
}

export function Hero({ className }: { className?: string }) {
  return (
    <section className={cn('relative overflow-hidden bg-background px-6 py-20 sm:py-28', className)}>
      <div className="mx-auto grid max-w-6xl gap-16 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-12">
        <div>
          <p
            className="animate-hero-in text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
            style={paso(0)}
          >
            Cartera, gastos y caja en un solo sitio
          </p>

          <h1
            className="animate-hero-in mt-6 text-balance text-[2.5rem] leading-[1.04] font-semibold tracking-tight text-foreground sm:text-6xl"
            style={paso(90)}
          >
            Deja de perseguir{' '}
            {/* La serif cursiva del destacado: `em` ya va en cursiva, solo cambia la familia. */}
            <em className="font-normal" style={{ fontFamily: SERIF_STACK }}>
              lo que te deben
            </em>
            .
          </h1>

          <p
            className="animate-hero-in mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground"
            style={paso(160)}
          >
            Nummo lleva tu cartera al día, te dice a quién hay que cobrarle hoy y se lo cobra por
            WhatsApp. Tú miras el saldo.
          </p>

          <div className="animate-hero-in mt-10 flex flex-col gap-3 sm:flex-row sm:items-center" style={paso(230)}>
            <a
              href="/register"
              className="inline-flex h-12 min-w-0 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              Crear cuenta gratis
              <ArrowRight className="size-4" aria-hidden />
            </a>
            <a
              href="#demo"
              className="inline-flex h-12 min-w-0 items-center justify-center rounded-lg border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              Ver una demo
            </a>
          </div>

          <p className="animate-hero-in mt-5 text-sm text-muted-foreground" style={paso(300)}>
            Gratis para empezar. Sin tarjeta.
          </p>
        </div>

        {/*
          El panel entra con inclinación mínima: lo justo para que se lea como una captura
          apoyada y no como una tarjeta más de la página. Más grados y empieza a parecer
          una plantilla.
        */}
        <div className="animate-hero-panel relative" style={paso(180)}>
          {/*
            El hueco de abajo no es decorativo: es donde se apoya el aviso de Numi. Sin
            él, el aviso flota encima de la última fila y tapa una cifra.
          */}
          <div className="rounded-2xl border border-border bg-card p-4 pb-14 shadow-sm sm:p-5 sm:pb-14">
            <p className="text-xs font-medium text-muted-foreground">Por cobrar</p>
            {/*
              Una cifra manda y las otras la acompañan (§11.1 (4)): cuatro KPIs del mismo
              tamaño no jerarquizan nada.
            */}
            <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground tabular-nums">
              {formatMoney('4620000.00')}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4 sm:gap-3">
              <div className="min-w-0">
                <p className="text-[0.6875rem] text-muted-foreground">Vencido</p>
                <p className="mt-0.5 text-[0.8125rem] font-medium text-destructive-strong tabular-nums sm:text-sm">
                  {formatMoney('1450000.00')}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-[0.6875rem] text-muted-foreground">Esta semana</p>
                <p className="mt-0.5 text-[0.8125rem] font-medium text-foreground tabular-nums sm:text-sm">
                  {formatMoney('860000.00')}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-[0.6875rem] text-muted-foreground">Cobrado en marzo</p>
                <p className="mt-0.5 text-[0.8125rem] font-medium text-success-strong tabular-nums sm:text-sm">
                  {formatMoney('3180000.00')}
                </p>
              </div>
            </div>

            <ul className="mt-5 space-y-3">
              {FILAS.map((fila) => (
                <li key={fila.nombre} className="flex items-center gap-3">
                  <span
                    className={cn('size-2 shrink-0 rounded-full', ESTADO_CLASE[fila.estado])}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-foreground">{fila.nombre}</span>
                    <span className="block truncate text-xs text-muted-foreground">{fila.detalle}</span>
                  </span>
                  <span className="shrink-0 text-sm font-medium text-foreground tabular-nums">
                    {formatMoney(fila.monto)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* El aviso de Numi llega el último, y por eso se nota. */}
          <div
            className="animate-hero-in absolute -bottom-6 -left-3 flex max-w-[17rem] items-start gap-2.5 rounded-xl bg-chat-bubble px-4 py-3 shadow-sm sm:-left-6"
            style={paso(620)}
          >
            <Sparkles className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
            <p className="text-sm leading-snug text-chat-bubble-foreground">
              Tres clientes entran en mora el viernes. ¿Les escribo?
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
