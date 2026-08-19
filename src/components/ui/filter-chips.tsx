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
 * **No se desplaza en horizontal: envuelve.** Una tira que se desplaza esconde
 * opciones detrás de un gesto que nadie ve, y a 360 px el corte a media ficha
 * es ruido visual constante. Envolver ocupa una línea más y no esconde nada.
 *
 * Con **cuatro fichas o más**, por debajo de `sm` van en rejilla de dos
 * columnas. Cuatro no caben en una línea a 360 px sin encoger el texto hasta
 * hacerlo incómodo, y dejarlas envolver da un 3 + 1 con una ficha suelta abajo
 * que se lee como un descuido. Dos y dos se lee como una decisión, y de paso el
 * objetivo táctil queda holgado (§43).
 *
 * Con **tres o menos** caben en una línea y envuelven libres: forzar la rejilla
 * ahí produce el 2 + 1 que la rejilla venía a evitar.
 *
 * Desde `sm` vuelven a ser fichas que hugean su contenido, que es como deben
 * verse cuando hay sitio.
 *
 * La lista que se le pasa debe ser **corta**: los estados frecuentes. Los de
 * consulta ocasional viven en los filtros avanzados (§21).
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
      className={cn(
        'gap-2 sm:flex sm:flex-wrap',
        choices.length > 3 ? 'grid grid-cols-2' : 'flex flex-wrap',
        className,
      )}
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
              'focus-visible:ring-ring/50 inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-sm whitespace-nowrap transition-colors focus-visible:ring-[3px] focus-visible:outline-none sm:justify-start',
              'pointer-coarse:min-h-11',
              isActive
                ? 'bg-foreground text-background border-foreground font-medium'
                : 'bg-card text-muted-foreground hover:border-brand/40 hover:text-foreground',
            )}
          >
            {choice.label}
            {choice.count !== undefined && (
              <>
                {/* El espacio es real: sin él el nombre accesible sale «Todas1». */}{' '}
                <span className={cn('nums text-[0.72rem]', isActive ? 'opacity-70' : 'opacity-55')}>
                  {choice.count}
                </span>
              </>
            )}
          </button>
        )
      })}
    </div>
  )
}
