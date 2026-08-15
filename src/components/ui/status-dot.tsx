import { cn } from '@/lib/utils'

/** Indicador de estado sobrio (punto + texto) — reemplaza los badges grandes. */
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
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-sm', className)}>
      <span
        className={cn('size-1.5 rounded-full', active ? 'bg-success' : 'bg-muted-foreground/40')}
      />
      <span className={active ? '' : 'text-muted-foreground'}>
        {active ? activeLabel : inactiveLabel}
      </span>
    </span>
  )
}
