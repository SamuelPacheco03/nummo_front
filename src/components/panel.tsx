import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Tarjeta de sección: título + acción opcional a la derecha, y cuerpo.
 *
 * El título va en sentence case y con la tipografía de display, no en la
 * micro-etiqueta en versalitas que se usaba antes. Cuando todas las secciones
 * gritan en MAYÚSCULAS, ninguna jerarquiza — y la pantalla acaba pareciendo una
 * plantilla en lugar de un producto.
 *
 * Tampoco lleva línea bajo la cabecera: el borde de la tarjeta ya separa, y una
 * regla más solo añade ruido a una consola que ya es densa.
 */
export function Panel({
  title,
  action,
  children,
  className,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('overflow-hidden rounded-lg border bg-card', className)}>
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
        <h2 className="font-display text-[0.95rem] font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  )
}
