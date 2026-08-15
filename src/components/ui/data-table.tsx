import { type ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

export type Column<T> = {
  header: ReactNode
  cell: (row: T) => ReactNode
  /** Clases del `<td>` en desktop. */
  className?: string
  /** Clases del `<th>` en desktop. */
  headClassName?: string
  /** Etiqueta en la tarjeta móvil (default: `header` si es texto). */
  label?: string
  /** Ocultar esta columna en la tarjeta móvil (p. ej. el chevron). */
  cardHidden?: boolean
}

/**
 * Tabla responsive mobile-first: en desktop (`md+`) es una tabla densa; en móvil
 * cada fila se vuelve una tarjeta. Por defecto la tarjeta apila las columnas como
 * etiqueta → valor; pásale `renderCard` para un diseño a medida.
 */
export function DataTable<T>({
  columns,
  rows,
  getKey,
  onRowClick,
  isLoading,
  skeletonRows = 6,
  emptyText = 'Sin datos.',
  renderCard,
  className,
}: {
  columns: Column<T>[]
  rows: T[]
  getKey: (row: T) => string
  onRowClick?: (row: T) => void
  isLoading?: boolean
  skeletonRows?: number
  emptyText?: ReactNode
  renderCard?: (row: T) => ReactNode
  className?: string
}) {
  const isEmpty = !isLoading && rows.length === 0

  const autoCard = (row: T) => (
    <dl className="space-y-1.5">
      {columns
        .filter((c) => !c.cardHidden)
        .map((c, i) => (
          <div key={i} className="flex items-baseline justify-between gap-3">
            <dt className="shrink-0 text-xs text-muted-foreground">
              {c.label ?? (typeof c.header === 'string' ? c.header : '')}
            </dt>
            <dd className="min-w-0 text-right text-sm">{c.cell(row)}</dd>
          </div>
        ))}
    </dl>
  )

  return (
    <div className={className}>
      {/* Desktop: tabla densa */}
      <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c, i) => (
                <TableHead key={i} className={c.headClassName}>
                  {c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={columns.length}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : isEmpty ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-10 text-center text-muted-foreground">
                  {emptyText}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={getKey(row)}
                  className={onRowClick ? 'cursor-pointer' : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((c, i) => (
                    <TableCell key={i} className={c.className}>
                      {c.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Móvil: tarjetas */}
      <div className="space-y-2 md:hidden">
        {isLoading ? (
          Array.from({ length: Math.min(skeletonRows, 5) }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))
        ) : isEmpty ? (
          <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
            {emptyText}
          </div>
        ) : (
          rows.map((row) => {
            const body = renderCard ? renderCard(row) : autoCard(row)
            return onRowClick ? (
              <button
                key={getKey(row)}
                type="button"
                onClick={() => onRowClick(row)}
                className={cn(
                  'block w-full rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted/50',
                )}
              >
                {body}
              </button>
            ) : (
              <div key={getKey(row)} className="rounded-lg border bg-card p-3">
                {body}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
