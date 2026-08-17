import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import type { QuickAction } from './quick-actions'

/**
 * Acción rápida en la rejilla del Panel: icono, verbo y para qué sirve.
 * En la barra de móvil el mismo catálogo se dibuja como fila, no como tarjeta.
 */
export function QuickActionTile({ action, className }: { action: QuickAction; className?: string }) {
  return (
    <Link
      to={action.to}
      className={cn(
        'bg-card hover:border-brand/40 hover:bg-secondary focus-visible:ring-ring/50 flex items-center gap-3 rounded-lg border p-3 transition-colors focus-visible:ring-[3px] focus-visible:outline-none',
        className,
      )}
    >
      <span className="bg-secondary text-brand grid size-9 shrink-0 place-items-center rounded-lg">
        <action.Icon aria-hidden className="size-4.5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{action.label}</span>
        <span className="text-muted-foreground block truncate text-xs">{action.description}</span>
      </span>
    </Link>
  )
}
