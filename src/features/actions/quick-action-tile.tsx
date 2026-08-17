import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import type { QuickAction } from './quick-actions'

/**
 * Acción rápida: botón de barra, no tarjeta.
 *
 * Antes era una tarjeta con borde y el icono dentro de un cuadrado tintado —el
 * patrón que hace que una pantalla parezca generada—. Seis de esas pesaban
 * visualmente lo mismo que las cuatro cifras de arriba, que es exactamente al
 * revés de lo que pide §2.1.
 *
 * Ahora es un botón sobrio: icono al tamaño del texto y el verbo. La descripción
 * se queda para la hoja de móvil, donde hay sitio y hace falta.
 */
export function QuickActionTile({ action, className }: { action: QuickAction; className?: string }) {
  return (
    <Link
      to={action.to}
      title={action.description}
      className={cn(
        'text-foreground hover:border-brand/50 hover:text-brand focus-visible:ring-ring/50 bg-card inline-flex items-center gap-2 rounded-full border py-2 pr-4 pl-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-[3px] focus-visible:outline-none',
        className,
      )}
    >
      <action.Icon aria-hidden className="text-muted-foreground size-4 shrink-0" />
      {action.short ?? action.label}
    </Link>
  )
}
