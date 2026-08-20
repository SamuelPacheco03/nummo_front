import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Tonos de la pastilla. Semánticos, como todo lo demás (§11.2). */
export type RowIconTone = 'neutral' | 'brand' | 'success' | 'warning' | 'destructive'

const TONES: Record<RowIconTone, string> = {
  neutral: 'bg-secondary text-muted-foreground',
  brand: 'bg-brand/10 text-brand',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
}

/**
 * Lo que una fila pone en el hueco de la izquierda de su tarjeta.
 *
 * Hoy lo rellena la pantalla con un icono fijo por tipo de lista, o con las
 * iniciales cuando la fila es una persona. **Está pensado para lo que viene**:
 * cuando las categorías de gasto y los conceptos de cobro tengan su icono y su
 * color, la lista los pasará aquí y la tarjeta no cambia ni una línea.
 *
 * Es de la tarjeta y no de la tabla a propósito: en escritorio la columna ya
 * dice de qué categoría es, y un icono por fila en una rejilla densa es ruido.
 */
export interface RowIcon {
  Icon?: LucideIcon
  /** Alternativa al icono: una o dos letras. Lo que usan las personas. */
  initials?: string
  tone?: RowIconTone
  /**
   * Se **suma** al tono, para lo que trae **su propio color del contrato**: el
   * icono de un concepto de cobro o de una categoría de gasto, que la
   * organización elige de una paleta cerrada. Los cinco tonos son semánticos y
   * ahí no significarían nada (§11.1.3b).
   *
   * Suma y no sustituye porque el color del catálogo es solo el del glifo
   * (`text-…`): sustituyendo, una categoría sin color elegido se quedaba también
   * sin la pastilla de fondo y su tarjeta parecía otra lista.
   */
  className?: string
  /** Redonda para quien tiene nombre; cuadrada para lo demás. */
  shape?: 'square' | 'round'
}

export function RowIconBadge({
  Icon,
  initials,
  tone = 'neutral',
  className,
  shape = 'square',
}: RowIcon) {
  if (!Icon && !initials) return null
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-9 shrink-0 place-items-center text-xs font-semibold',
        shape === 'round' ? 'rounded-full' : 'rounded-lg',
        TONES[tone],
        className,
      )}
    >
      {Icon ? <Icon className="size-4.5" /> : initials}
    </span>
  )
}
