import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Tarjeta de sección de consola: cabecera (título + acción/hint opcional a la
 * derecha) y cuerpo con padding. Usada en el Panel y en Informes.
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
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}
