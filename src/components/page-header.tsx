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
        'border-border mb-5 flex items-start justify-between gap-3 border-b pb-3',
        className,
      )}
    >
      <div className="min-w-0 space-y-0.5">
        {/*
          24px en móvil y 30px en escritorio. La jerarquía la pide §8 (28–32 px en
          escritorio); quedarse en 30 es lo que mantiene la densidad de consola sin
          que el título compita con las cifras, que son las protagonistas (§2.1).
        */}
        <h1 className="font-display text-2xl font-semibold tracking-tight lg:text-3xl">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  )
}
