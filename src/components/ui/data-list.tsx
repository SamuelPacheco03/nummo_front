import { type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight } from 'lucide-react'
import {
  flexRender,
  useTable,
  type ColumnDef,
  type RowData,
  type SortingState,
} from '@tanstack/react-table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { listFeatures, type ListFeatures } from '@/components/ui/list-columns'
import { RowIconBadge, type RowIcon } from '@/components/ui/row-icon'
import { cn } from '@/lib/utils'


interface SortOption {
  /** Valor de `sort` que acepta el endpoint. */
  field: string
  label: string
}

/**
 * Cómo llama el endpoint al campo que ordena una columna: lo que diga su
 * `meta.sortField` y, si no dice nada, su propio `id` (ver `ListColumnMeta`).
 */
function sortFieldOf(column: { id: string; columnDef: { meta?: { sortField?: string } } }) {
  return column.columnDef.meta?.sortField ?? column.id
}

interface DataListProps<TData extends RowData> {
  columns: ColumnDef<ListFeatures, TData, unknown>[]
  rows: TData[]
  getRowId: (row: TData) => string
  onRowClick?: (row: TData) => void
  isLoading?: boolean
  skeletonRows?: number
  emptyText?: ReactNode
  /**
   * Orden por columna. Se omite si el endpoint no acepta `sort`.
   *
   * Dibuja las cabeceras clicables de la tabla: **una por cada columna cuyo
   * campo esté en `options`**, y ninguna más. La otra puerta al mismo dato es
   * `FilterSortField`, dentro del cajón de filtros —la única que hay en móvil,
   * donde las filas son tarjetas y no tienen cabecera—. Las dos escriben en la
   * URL, así que no pueden contradecirse (§21.1).
   */
  sort?: {
    value: SortingState
    onChange: (value: SortingState) => void
    options: SortOption[]
  }
  /**
   * Qué pinta cada fila en el hueco de la izquierda de su **tarjeta de móvil**.
   *
   * No existe en escritorio: la tabla ya tiene una columna para eso y un icono
   * por fila en una rejilla densa es ruido. Ver `RowIcon`.
   */
  rowIcon?: (row: TData) => RowIcon | undefined
  className?: string
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
 *
 * **Aquí no hay barra.** El buscador, el estado y el botón de filtros los dibuja
 * `ListToolbar` encima, para todas las listas igual (§21.1); esta sí dibuja las
 * cabeceras que ordenan, porque son parte de la tabla.
 */
export function DataList<TData extends RowData>({
  columns,
  rows,
  getRowId,
  onRowClick,
  isLoading,
  skeletonRows = 8,
  emptyText = 'Sin datos.',
  sort,
  rowIcon,
  className,
}: DataListProps<TData>) {
  const table = useTable({
    features: listFeatures,
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

  const visible = table.getAllLeafColumns().filter((c) => !c.columnDef.meta?.hideOnTable)

  const isEmpty = !isLoading && rows.length === 0
  const activeSort = sort?.value[0]

  return (
    <div className={className}>
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
                // Ordenable = el campo de la columna está entre los que acepta
                // el endpoint. Ni uno menos: una columna que el API sabe ordenar
                // y la cabecera no ofrece es orden perdido, y es como se separan
                // dos pantallas que deberían ordenar igual.
                const field = sortFieldOf(col)
                const option = sort?.options.find((o) => o.field === field)
                const isActive = activeSort?.id === field
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
                        // La columna activa alterna; cambiar de columna conserva
                        // la dirección, igual que el cajón: si venías mirando lo
                        // más reciente primero, sigues queriendo lo más reciente.
                        onClick={() =>
                          sort.onChange([
                            {
                              id: field,
                              desc: isActive ? !activeSort?.desc : Boolean(activeSort?.desc),
                            },
                          ])
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
                  {row
                    .getAllCells()
                    .filter((cell) => !cell.column.columnDef.meta?.hideOnTable)
                    .map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          cell.column.columnDef.meta?.align === 'right' &&
                            'nums text-right font-medium',
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

      {/* Móvil y tablet: cada fila es una tarjeta. */}
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
            const cells = row
              .getAllCells()
              .filter((cell) => !cell.column.columnDef.meta?.hideOnStack)
            const roleOf = (cell: (typeof cells)[number]) => cell.column.columnDef.meta?.card
            const render = (cell: (typeof cells)[number]) =>
              flexRender(cell.column.columnDef.cell, cell.getContext())

            const title = cells.find((c) => roleOf(c) === 'title')
            const metas = cells.filter((c) => roleOf(c) === 'meta')
            const status = cells.filter((c) => roleOf(c) === 'status')
            const amount = cells.find((c) => roleOf(c) === 'amount')
            const sub = cells.find((c) => roleOf(c) === 'sub')
            /* Sin papel no es «sin sitio»: van al pie, como pares etiqueta-valor. */
            const rest = cells.filter((c) => !roleOf(c))

            const pairs = (list: typeof cells) => (
              <dl className="space-y-1.5">
                {list.map((cell) => {
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
                        {render(cell)}
                      </dd>
                    </div>
                  )
                })}
              </dl>
            )

            const icon = rowIcon?.(row.original)

            /*
              Sin columna `title` no hay tarjeta que armar, así que se cae al
              apilado de siempre. Es lo que permite migrar las listas de una en
              una sin que ninguna se rompa por el camino.
            */
            const body = !title ? (
              pairs(cells)
            ) : (
              <div className="flex items-start gap-3">
                {icon && <RowIconBadge {...icon} />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <span className="min-w-0 flex-1 truncate font-medium">{render(title)}</span>
                    {onRowClick && (
                      <ChevronRight
                        aria-hidden
                        className="text-muted-foreground mt-1 size-4 shrink-0"
                      />
                    )}
                  </div>

                  {metas.length > 0 && (
                    <p className="text-muted-foreground mt-0.5 truncate text-xs">
                      {metas.map((cell, i) => (
                        <span key={cell.id}>
                          {i > 0 && <span className="px-1">·</span>}
                          {render(cell)}
                        </span>
                      ))}
                    </p>
                  )}

                  {(status.length > 0 || amount) && (
                    <div className="mt-2 flex items-end justify-between gap-3">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        {status.map((cell) => (
                          <span key={cell.id}>{render(cell)}</span>
                        ))}
                      </div>
                      {amount && (
                        <div className="shrink-0 text-right">
                          <div className="nums text-base leading-tight font-semibold tracking-tight">
                            {render(amount)}
                          </div>
                          {sub && (
                            <div className="text-muted-foreground nums text-xs">{render(sub)}</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {rest.length > 0 && <div className="mt-2.5 border-t pt-2.5">{pairs(rest)}</div>}
                </div>
              </div>
            )

            return onRowClick ? (
              <button
                key={row.id}
                type="button"
                onClick={() => onRowClick(row.original)}
                className="bg-card hover:bg-muted/50 focus-visible:ring-ring/50 block w-full rounded-lg border p-3 text-left transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
              >
                {body}
              </button>
            ) : (
              <div key={row.id} className="bg-card rounded-lg border p-3">
                {body}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

/** Chevron de "abrir ficha", como última columna de las listas navegables. */
export function RowChevron() {
  return <ChevronRight className="text-muted-foreground size-4" />
}
