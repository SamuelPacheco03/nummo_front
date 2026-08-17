import { type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, X } from 'lucide-react'
import {
  createColumnHelper,
  flexRender,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
  type SortingState,
} from '@tanstack/react-table'
import { NativeSelect } from '@/components/ui/native-select'
import { SearchInput } from '@/components/search-input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

/**
 * Solo `rowSortingFeature`: en modo manual el orden lo hace el API, así que no
 * registramos `sortedRowModel` — se ignoraría. La feature está por el estado de
 * orden y por `column.getCanSort()`, que es lo que dibuja el control.
 */
const features = tableFeatures({ rowSortingFeature })

export type ListFeatures = typeof features

/** Helper tipado para declarar columnas desde cada lista. */
export function listColumns<TData extends RowData>() {
  return createColumnHelper<ListFeatures, TData>()
}

/**
 * Pistas de presentación que viajan con la columna. Son lo que permite que un
 * único modelo de columnas dibuje la rejilla de escritorio y el apilado de
 * móvil sin duplicar la definición en dos sitios.
 */
export interface ListColumnMeta {
  /** Etiqueta en el apilado de móvil. Por defecto, la cabecera si es texto. */
  label?: string
  /** Alineación del valor. Los importes van a la derecha. */
  align?: 'right'
  /** Fuera del apilado de móvil: chevrons y adornos que ahí no aportan. */
  hideOnStack?: boolean
}

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TFeatures, TData, TValue> extends ListColumnMeta {}
}

export interface SortOption {
  /** Valor de `sort` que acepta el endpoint. */
  field: string
  label: string
}

export interface DataListProps<TData extends RowData> {
  columns: ColumnDef<ListFeatures, TData, unknown>[]
  rows: TData[]
  getRowId: (row: TData) => string
  onRowClick?: (row: TData) => void
  isLoading?: boolean
  skeletonRows?: number
  emptyText?: ReactNode
  /** Buscador. Se omite si el endpoint no acepta `q`. */
  search?: { value: string; onChange: (value: string) => void; placeholder?: string }
  /**
   * Orden por columna. Se omite si el endpoint no acepta `sort`.
   *
   * Dibuja dos cosas: las cabeceras clicables de la tabla y el control suelto de
   * la barra. `showSortControl: false` deja solo las cabeceras, para las
   * pantallas que ya ofrecen el orden desde su cajón de filtros — el control
   * suelto ahí sería una tercera puerta al mismo dato.
   */
  sort?: {
    value: SortingState
    onChange: (value: SortingState) => void
    options: SortOption[]
    showSortControl?: boolean
  }
  /** Filtros propios de la lista, a la derecha de la barra. */
  filters?: ReactNode
  /**
   * Filtros activos ahora mismo, uno por criterio (§21: deben verse y poder
   * soltarse). Se dibujan como fichas bajo la barra, con su × y un "Limpiar
   * todo". Si va vacío, no ocupa sitio.
   */
  activeFilters?: ActiveFilter[]
  /** Suelta todos los criterios de golpe. */
  onClearFilters?: () => void
  className?: string
}

export interface ActiveFilter {
  id: string
  /** Lo que el usuario reconoce: "Vencidas", "Pagador: Laura Gómez". */
  label: string
  onRemove: () => void
}

/**
 * Listado de registros: tabla densa en escritorio y tarjetas apiladas en móvil
 * y tablet, a partir de un único modelo de columnas.
 *
 * El motor es TanStack Table en **modo manual**: la búsqueda y el orden los
 * resuelve el API, y la tabla solo guarda el estado. Conectarla en modo cliente
 * sería un error silencioso — solo ve las filas de la página cargada, así que un
 * buscador encontraría 20 registros e ignoraría el resto en silencio.
 *
 * La paginación ni siquiera se registra como feature: de ella se encarga
 * `<Pagination>` contra el total que devuelve el servidor.
 */
export function DataList<TData extends RowData>({
  columns,
  rows,
  getRowId,
  onRowClick,
  isLoading,
  skeletonRows = 8,
  emptyText = 'Sin datos.',
  search,
  sort,
  filters,
  activeFilters,
  onClearFilters,
  className,
}: DataListProps<TData>) {
  const table = useTable({
    features,
    columns,
    data: rows,
    getRowId,
    manualSorting: true,
    enableSorting: Boolean(sort),
    state: sort ? { sorting: sort.value } : undefined,
    // TanStack entrega un updater, que puede ser el valor o una función sobre
    // el anterior; la lista solo quiere el valor ya resuelto.
    onSortingChange: sort
      ? (updater) => sort.onChange(typeof updater === 'function' ? updater(sort.value) : updater)
      : undefined,
  })

  const visible = table.getAllLeafColumns()

  const isEmpty = !isLoading && rows.length === 0
  const activeSort = sort?.value[0]

  return (
    <div className={className}>
      {(search || filters || (sort && sort.showSortControl !== false)) && (
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          {search && (
            <div className="sm:w-72">
              <SearchInput
                value={search.value}
                onChange={search.onChange}
                placeholder={search.placeholder ?? 'Buscar…'}
              />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            {filters}
            {sort && sort.showSortControl !== false && (
              <SortControl
                options={sort.options}
                value={activeSort}
                onChange={(next) => sort.onChange(next ? [next] : [])}
              />
            )}
          </div>
        </div>
      )}

      {activeFilters && activeFilters.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground text-xs">Filtros:</span>
          {activeFilters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={filter.onRemove}
              className="bg-secondary hover:bg-secondary/70 focus-visible:ring-ring/50 text-secondary-foreground inline-flex items-center gap-1 rounded-full py-1 pr-1.5 pl-2.5 text-xs transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
            >
              {filter.label}
              <X aria-hidden className="size-3.5" />
              <span className="sr-only">Quitar filtro</span>
            </button>
          ))}
          {onClearFilters && activeFilters.length > 1 && (
            <button
              type="button"
              onClick={onClearFilters}
              className="text-muted-foreground hover:text-foreground ml-1 text-xs underline-offset-4 hover:underline"
            >
              Limpiar todo
            </button>
          )}
        </div>
      )}

      {/* Escritorio: tabla densa */}
      <div className="bg-card hidden overflow-hidden rounded-lg border lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              {visible.map((col) => {
                const alignRight = col.columnDef.meta?.align === 'right'
                const label = flexRender(col.columnDef.header, {
                  column: col,
                  header: undefined as never,
                  table,
                })
                // Ordenable = la columna está entre las que acepta el endpoint.
                const option = sort?.options.find((o) => o.field === col.id)
                const isActive = activeSort?.id === col.id
                return (
                  <TableHead
                    key={col.id}
                    className={cn(alignRight && 'text-right')}
                    aria-sort={
                      isActive ? (activeSort?.desc ? 'descending' : 'ascending') : undefined
                    }
                  >
                    {option && sort ? (
                      <button
                        type="button"
                        onClick={() =>
                          sort.onChange([{ id: col.id, desc: isActive ? !activeSort?.desc : false }])
                        }
                        className={cn(
                          'hover:text-foreground inline-flex items-center gap-1 uppercase transition-colors',
                          alignRight && 'flex-row-reverse',
                          isActive && 'text-foreground',
                        )}
                      >
                        {label}
                        {isActive ? (
                          activeSort?.desc ? (
                            <ArrowDown className="size-3" />
                          ) : (
                            <ArrowUp className="size-3" />
                          )
                        ) : (
                          <ArrowUpDown className="size-3 opacity-40" />
                        )}
                      </button>
                    ) : (
                      label
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={visible.length}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : isEmpty ? (
              <TableRow>
                <TableCell
                  colSpan={visible.length}
                  className="text-muted-foreground py-10 text-center"
                >
                  {emptyText}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={onRowClick ? 'cursor-pointer' : undefined}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                >
                  {row.getAllCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        cell.column.columnDef.meta?.align === 'right' && 'nums text-right font-medium',
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Móvil y tablet: cada fila es una tarjeta apilada. */}
      <div className="space-y-2 lg:hidden">
        {isLoading ? (
          Array.from({ length: Math.min(skeletonRows, 5) }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))
        ) : isEmpty ? (
          <p className="bg-card text-muted-foreground rounded-lg border p-6 text-center text-sm">
            {emptyText}
          </p>
        ) : (
          table.getRowModel().rows.map((row) => {
            const stack = (
              <dl className="space-y-1.5">
                {row
                  .getAllCells()
                  .filter((cell) => !cell.column.columnDef.meta?.hideOnStack)
                  .map((cell) => {
                    const meta = cell.column.columnDef.meta
                    const header = cell.column.columnDef.header
                    return (
                      <div key={cell.id} className="flex items-baseline justify-between gap-3">
                        <dt className="text-muted-foreground shrink-0 text-xs">
                          {meta?.label ?? (typeof header === 'string' ? header : '')}
                        </dt>
                        <dd
                          className={cn(
                            'min-w-0 text-right text-sm',
                            meta?.align === 'right' && 'nums font-medium',
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </dd>
                      </div>
                    )
                  })}
              </dl>
            )
            return onRowClick ? (
              <button
                key={row.id}
                type="button"
                onClick={() => onRowClick(row.original)}
                className="bg-card hover:bg-muted/50 focus-visible:ring-ring/50 block w-full rounded-lg border p-3 text-left transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
              >
                {stack}
              </button>
            ) : (
              <div key={row.id} className="bg-card rounded-lg border p-3">
                {stack}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

/**
 * Control de orden. Va aquí y no en cabeceras clicables porque las filas-tarjeta
 * no tienen cabecera: el mismo control sirve igual en escritorio y en móvil.
 */
function SortControl({
  options,
  value,
  onChange,
}: {
  options: SortOption[]
  value?: { id: string; desc: boolean }
  onChange: (next?: { id: string; desc: boolean }) => void
}) {
  const current = value ?? { id: options[0]?.field ?? '', desc: false }

  return (
    <div className="flex items-center gap-1">
      <NativeSelect
        className="w-44"
        aria-label="Ordenar por"
        value={current.id}
        onChange={(e) => onChange({ id: e.target.value, desc: current.desc })}
      >
        {options.map((option) => (
          <option key={option.field} value={option.field}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
      <button
        type="button"
        onClick={() => onChange({ id: current.id, desc: !current.desc })}
        aria-label={current.desc ? 'Orden descendente' : 'Orden ascendente'}
        title={current.desc ? 'Descendente' : 'Ascendente'}
        className="text-muted-foreground hover:bg-secondary hover:text-foreground grid size-9 shrink-0 place-items-center rounded-md border transition-colors"
      >
        {current.desc ? <ArrowDown className="size-4" /> : <ArrowUp className="size-4" />}
      </button>
    </div>
  )
}

/** Chevron de "abrir ficha", como última columna de las listas navegables. */
export function RowChevron() {
  return <ChevronRight className="text-muted-foreground size-4" />
}
