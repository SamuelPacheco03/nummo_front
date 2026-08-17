import { cn } from '@/lib/utils'

/**
 * Tono semántico de un estado. El significado es fijo en todo el producto y no
 * se reinterpreta por pantalla (§7):
 *
 *   success     → pagado, conciliado, activo, completado
 *   warning     → pendiente, parcial, pausado, próximo a vencer
 *   destructive → vencido, en mora, fallido
 *   muted       → archivado, inactivo, borrador, sin datos
 */
export type StatusTone = 'success' | 'warning' | 'destructive' | 'muted'

const TONE_DOT: Record<StatusTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  muted: 'bg-muted-foreground/40',
}

/**
 * Indicador de estado del producto: punto de color + etiqueta.
 *
 * El punto va `aria-hidden` a propósito. El estado nunca se comunica solo con
 * color (§7): la etiqueta lleva el significado y el punto solo lo refuerza, así
 * que para un lector de pantalla el punto es ruido.
 *
 * Cada dominio decide el par tono/etiqueta en su `labels.ts`, y aquí solo se
 * dibuja:
 *
 * ```tsx
 * <StatusBadge {...receivableStatus(row.displayStatus)} />
 * ```
 */
export function StatusBadge({
  tone,
  label,
  className,
}: {
  tone: StatusTone
  label: string
  className?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm whitespace-nowrap', className)}>
      <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', TONE_DOT[tone])} />
      {label}
    </span>
  )
}

/**
 * Atajo para el caso booleano activo/inactivo, que es el más repetido de todos
 * (contactos, maestros, estado del sistema). Es el mismo indicador: cambia solo
 * la forma de pedirlo.
 */
export function StatusDot({
  active,
  activeLabel = 'Activo',
  inactiveLabel = 'Inactivo',
  className,
}: {
  active: boolean
  activeLabel?: string
  inactiveLabel?: string
  className?: string
}) {
  return (
    <StatusBadge
      tone={active ? 'success' : 'muted'}
      label={active ? activeLabel : inactiveLabel}
      className={cn(!active && 'text-muted-foreground', className)}
    />
  )
}
