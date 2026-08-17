import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Encabezado de página de consola: título + descripción + acciones a la derecha. */
export function PageHeader({
  title,
  description,
  children,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4',
        className,
      )}
    >
      <div className="space-y-1">
        {/*
          24px en móvil y 30px en escritorio. La jerarquía la pide §8 (28–32 px en
          escritorio); quedarse en 30 es lo que mantiene la densidad de consola sin
          que el título compita con las cifras, que son las protagonistas (§2.1).
        */}
        <h1 className="font-display text-2xl font-semibold tracking-tight lg:text-3xl">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}
