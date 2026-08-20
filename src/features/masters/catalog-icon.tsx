import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { catalogColorClass, catalogIcon } from './catalogs'

/**
 * El glifo con su color, al tamaño del texto y **sin pastilla tintada detrás**:
 * el cuadradito de color repetido en cada fila es el tic de plantilla que §11.1
 * prohíbe.
 */
export function CatalogIcon({
  icon,
  color,
  fallback,
  className,
}: {
  icon: string | null | undefined
  color: string | null | undefined
  /** Qué pintar cuando el registro no tiene icono propio. */
  fallback: LucideIcon
  className?: string
}) {
  const Icon = catalogIcon(icon) ?? fallback
  return (
    <Icon aria-hidden className={cn('size-4 shrink-0', catalogColorClass(color), className)} />
  )
}
