import { SearchInput } from '@/components/search-input'
import { FilterChips, type FilterChoice } from '@/components/ui/filter-chips'
import { FilterSheetTrigger } from '@/components/ui/filter-sheet'
import { NativeSelect } from '@/components/ui/native-select'

/**
 * **La fila de controles de un listado**: buscar, el filtro principal, y el
 * botón que abre el resto.
 *
 * El filtro principal cambia de forma con el breakpoint, y no por capricho: en
 * móvil el dedo agradece un objetivo grande y siempre visible, así que va como
 * fichas; desde `lg` la lista **es** una tabla, con su propia fila de cabeceras,
 * y una rejilla de fichas ahí compite con ellas — vuelve a ser un desplegable
 * junto al buscador.
 *
 * Vive aquí porque son las **dos decisiones que hay que tomar igual en todas las
 * listas**: dónde va cada filtro según el ancho, y que el cajón quede a la
 * derecha del todo porque no es un criterio más. Estaba copiada en tres
 * pantallas y a punto de copiarse en tres más.
 */
export function ListToolbar({
  search,
  onSearch,
  searchPlaceholder,
  main,
  filterCount,
  onOpenFilters,
}: {
  /**
   * El buscador, **solo donde el endpoint acepta un `q`**.
   *
   * Se omite entero —los tres van juntos— cuando no lo acepta: una caja de
   * búsqueda que no filtra nada es la misma promesa incumplida que una cabecera
   * que ordena por un campo que el contrato no conoce (§18.1, regla 3). Pasa hoy
   * en el historial de mensajes de cobranza, que se filtra por estado y por
   * contacto y no por texto.
   */
  search?: string
  onSearch?: (value: string) => void
  searchPlaceholder?: string
  /**
   * El filtro principal de la pantalla: estado, tipo, dirección… Se omite en las
   * listas que no tienen uno destacado.
   */
  main?: {
    /** Nombre accesible, y el que se lee en el vacío: «Todos los estados». */
    label: string
    /** Texto de la opción «sin filtrar»: «Todos los estados». */
    allLabel: string
    /** Las pocas que van a la vista en móvil. La primera es «todas». */
    choices: FilterChoice[]
    /**
     * Las del desplegable de escritorio. Por defecto, las mismas fichas.
     *
     * Se separan porque no siempre coinciden: en cartera las fichas enseñan los
     * estados del trabajo diario y el desplegable llega hasta las pagadas y
     * canceladas, que son consulta ocasional (§21).
     */
    options?: { value: string; label: string }[]
    value: string
    onChange: (value: string) => void
  }
  /** Cuántos criterios hay puestos dentro del cajón. */
  filterCount: number
  onOpenFilters: () => void
}) {
  return (
    <div className="space-y-3">
      {main && (
        <FilterChips
          className="lg:hidden"
          label={main.label}
          choices={main.choices}
          value={main.value}
          onChange={main.onChange}
        />
      )}

      <div className="flex items-center gap-2">
        {onSearch && (
          <div className="min-w-0 flex-1 sm:max-w-72">
            <SearchInput
              value={search ?? ''}
              onChange={onSearch}
              placeholder={searchPlaceholder ?? 'Buscar…'}
            />
          </div>
        )}

        {main && (
          /* Ocultar va en la envoltura: `className` llega al `select`, y el
             chevron vive fuera de él. */
          <div className="hidden lg:block">
            <NativeSelect
              className="w-44"
              value={main.value}
              onChange={(e) => main.onChange(e.target.value)}
              aria-label={main.label}
            >
              <option value="">{main.allLabel}</option>
              {(main.options ?? main.choices)
                .filter((option) => option.value)
                .map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
            </NativeSelect>
          </div>
        )}

        {/* A la derecha del todo: es el cajón, no un criterio más. */}
        <FilterSheetTrigger className="ml-auto" count={filterCount} onClick={onOpenFilters} />
      </div>
    </div>
  )
}
