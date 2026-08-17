import { type ReactNode } from 'react'
import { Inbox, SearchX } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Estado vacío. Nunca es "No hay datos" a secas: explica qué es la sección y
 * ofrece el siguiente paso (§27, §75).
 *
 * ```tsx
 * <EmptyState
 *   Icon={FileText}
 *   title="Todavía no tienes cobros recurrentes"
 *   description="Crea uno para que Nummo genere solo las cuentas por cobrar de cada período."
 *   action={<Button onClick={…}>Crear cobro recurrente</Button>}
 * />
 * ```
 */
export function EmptyState({
  Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  Icon?: LucideIcon
  title: string
  description?: ReactNode
  /** El siguiente paso. Se omite cuando el usuario no puede actuar (permisos). */
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center gap-3 px-6 py-10 text-center', className)}>
      <span className="bg-muted text-muted-foreground grid size-10 place-items-center rounded-full">
        <Icon aria-hidden className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description && (
          <p className="text-muted-foreground mx-auto max-w-sm text-sm text-balance">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}

/**
 * El otro vacío, que no es el mismo: aquí SÍ hay datos, solo que ninguno pasa
 * el filtro. El siguiente paso no es crear nada, es soltar el filtro — por eso
 * no reutiliza el CTA de `EmptyState` (§21: limpiar filtros debe ser fácil).
 */
export function NoResults({
  entity,
  onClear,
  className,
}: {
  /** En plural y en minúscula: "contactos", "pagos", "cuentas por cobrar". */
  entity: string
  onClear?: () => void
  className?: string
}) {
  return (
    <EmptyState
      Icon={SearchX}
      title={`Ningún resultado`}
      description={`No hay ${entity} que coincidan con la búsqueda o los filtros activos.`}
      action={
        onClear && (
          <Button variant="outline" size="sm" onClick={onClear}>
            Limpiar filtros
          </Button>
        )
      }
      className={className}
    />
  )
}
