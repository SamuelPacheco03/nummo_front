import { ArrowUpRight, Sparkles } from 'lucide-react'
import { RowIconBadge, type RowIconTone } from '@/components/ui/row-icon'
import { FLUJO } from './flow'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * La app, enseñada.
 *
 * Vive en `marketing/` porque solo la usa la portada. Estuvo un rato en `components/` para
 * que la compartiera también la pantalla de acceso, y ese fue el error: meter la vitrina del
 * producto en el login lo convertía en una portada pequeña. Un login no vende, deja entrar.
 *
 * Las cifras son de muestra, pero pasan por `formatMoney`: si el formato de la app cambia,
 * cambia aquí también y no hay dos maneras de escribir un peso.
 */

/* El texto sale de `FLUJO`; aquí solo se decide con qué tono se pinta cada pastilla. */
const TONOS: readonly RowIconTone[] = ['success', 'brand', 'success']

export function AppPreview({
  className,
  /** Deja hueco abajo para el aviso de Numi, que se monta encima desde fuera. */
  huecoParaAviso = false,
}: {
  className?: string
  huecoParaAviso?: boolean
}) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-border bg-card shadow-sm', className)}>
      {/* Cromo de ventana: es lo que dice «esto es la app» sin escribirlo. */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden>
          <span className="size-2 rounded-full bg-muted-foreground/25" />
          <span className="size-2 rounded-full bg-muted-foreground/25" />
          <span className="size-2 rounded-full bg-muted-foreground/25" />
        </span>
        <span className="text-xs text-muted-foreground">Mi operación · Hoy</span>
      </div>

      <div className={cn('p-5', huecoParaAviso && 'pb-16')}>
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
          {FLUJO.map((a, i) => (
            <li key={a.titulo} className="flex items-center gap-3">
              {/* La pastilla de la consola, no una imitación (§94). */}
              <RowIconBadge Icon={a.Icon} tone={TONOS[i]} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">{a.titulo}</span>
                <span className="block truncate text-xs text-muted-foreground">{a.detalle}</span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">Hoy</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/** El aviso de Numi que se apoya en el panel. Fuera de él, para poder colocarlo. */
export function NumiNotice({
  className,
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      style={style}
      className={cn(
        'flex max-w-[19rem] items-start gap-2.5 rounded-xl bg-sidebar px-4 py-3 shadow-sm ring-1 ring-border',
        className,
      )}
    >
      <Sparkles className="mt-0.5 size-4 shrink-0 text-sidebar-primary" aria-hidden />
      <span className="min-w-0">
        <span className="block text-[0.6875rem] text-sidebar-muted-foreground">Numi dice</span>
        <span className="block text-sm leading-snug text-sidebar-foreground">
          Tu flujo está 18% más saludable que el mes pasado.
        </span>
      </span>
    </div>
  )
}
