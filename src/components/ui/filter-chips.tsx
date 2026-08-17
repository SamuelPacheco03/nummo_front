import { cn } from '@/lib/utils'

export interface FilterChoice {
  /** Valor que viaja al API. La cadena vacía es «todas». */
  value: string
  label: string
  /** Cuántos registros hay en ese estado, cuando el API lo devuelve. */
  count?: number
}

/**
 * Filtro principal de una lista, como fichas siempre visibles.
 *
 * Sustituye al desplegable: el estado es *el* filtro de estas pantallas y meterlo
 * dentro de un `select` costaba tres toques y escondía cuántos registros hay en
 * cada uno. Con fichas se ve el reparto sin filtrar nada (§21).
 *
 * En pantallas estrechas la fila se desplaza en horizontal en vez de romperse en
 * varias líneas: mantiene el orden de lectura —lo que más urge primero— y no
 * empuja la lista hacia abajo.
 */
export function FilterChips({
  choices,
  value,
  onChange,
  label,
  className,
}: {
  choices: FilterChoice[]
  value: string
  onChange: (value: string) => void
  label: string
  className?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('scrollbar-slim -mx-1 flex gap-2 overflow-x-auto px-1 pb-1', className)}
    >
      {choices.map((choice) => {
        const isActive = choice.value === value
        return (
          <button
            key={choice.value || 'all'}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(choice.value)}
            className={cn(
              'focus-visible:ring-ring/50 inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm whitespace-nowrap transition-colors focus-visible:ring-[3px] focus-visible:outline-none',
              'pointer-coarse:min-h-11',
              isActive
                ? 'bg-foreground text-background border-foreground font-medium'
                : 'bg-card text-muted-foreground hover:border-brand/40 hover:text-foreground',
            )}
          >
            {choice.label}
            {choice.count !== undefined && (
              <span className={cn('nums text-xs', isActive ? 'opacity-70' : 'opacity-60')}>
                {choice.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
