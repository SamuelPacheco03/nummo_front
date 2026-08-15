import { useEffect, useState, type ReactNode } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import { SearchInput } from '@/components/search-input'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { DataTable, type Column as DTColumn } from '@/components/ui/data-table'
import { StatusDot } from '@/components/ui/status-dot'
import { getErrorMessage } from '@/lib/errors'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import type { MasterParams } from './hooks'

const PAGE_SIZE = 20

export interface Column<T> {
  header: string
  cell: (row: T) => ReactNode
  className?: string
  headClassName?: string
}

export interface ListResult<T> {
  items: T[]
  total: number
  totalPages: number
  isPending: boolean
  isError: boolean
  error: unknown
  isFetching: boolean
}

export interface MasterListState {
  search: string
  setSearch: (value: string) => void
  active: '' | 'true' | 'false'
  setActive: (value: '' | 'true' | 'false') => void
  page: number
  setPage: (page: number) => void
  params: MasterParams
}

/** Estado de filtros/paginación para un listado de maestros. */
export function useMasterListState(): MasterListState {
  const [search, setSearch] = useState('')
  const q = useDebouncedValue(search.trim(), 300)
  const [active, setActive] = useState<'' | 'true' | 'false'>('true')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [q, active])

  const params: MasterParams = {
    page,
    pageSize: PAGE_SIZE,
    q: q || undefined,
    isActive: active || undefined,
    sort: 'name',
    order: 'asc',
  }

  return { search, setSearch, active, setActive, page, setPage, params }
}

/** Listado CRUD genérico de maestros (presentacional): filtros + tabla densa + paginación. */
export function MasterCrud<T extends { id: string; isActive: boolean }>({
  title,
  description,
  canManage,
  newLabel = 'Nuevo',
  searchPlaceholder = 'Buscar…',
  state,
  list,
  columns,
  onNew,
  onEdit,
}: {
  title: string
  description: string
  canManage: boolean
  newLabel?: string
  searchPlaceholder?: string
  state: MasterListState
  list: ListResult<T>
  columns: Column<T>[]
  onNew: () => void
  onEdit: (row: T) => void
}) {
  const { items, total, totalPages, isPending, isError, error, isFetching } = list

  const editButton = (row: T) => (
    <Button variant="ghost" size="icon" className="size-8" onClick={() => onEdit(row)} aria-label="Editar">
      <Pencil className="size-4" />
    </Button>
  )
  const allColumns: DTColumn<T>[] = [
    ...columns,
    { header: 'Estado', cell: (row) => <StatusDot active={row.isActive} /> },
    ...(canManage
      ? [{ header: '', cell: editButton, className: 'w-16 text-right', cardHidden: true } satisfies DTColumn<T>]
      : []),
  ]
  const renderCard = (row: T) => (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 space-y-0.5">
        {columns.map((c, i) => (
          <div key={i} className={i === 0 ? 'font-medium' : 'text-sm text-muted-foreground'}>
            {c.cell(row)}
          </div>
        ))}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <StatusDot active={row.isActive} activeLabel="" inactiveLabel="" />
        {canManage && editButton(row)}
      </div>
    </div>
  )

  return (
    <div>
      <PageHeader title={title} description={description}>
        {canManage && (
          <Button size="sm" onClick={onNew}>
            <Plus className="size-4" />
            {newLabel}
          </Button>
        )}
      </PageHeader>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput
          value={state.search}
          onChange={state.setSearch}
          placeholder={searchPlaceholder}
          className="sm:max-w-xs"
        />
        <NativeSelect
          className="w-32 sm:ml-auto"
          value={state.active}
          onChange={(e) => state.setActive(e.target.value as '' | 'true' | 'false')}
          aria-label="Estado"
        >
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
          <option value="">Todos</option>
        </NativeSelect>
      </div>

      {isError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {getErrorMessage(error, 'No se pudo cargar la información.')}
        </div>
      ) : (
        <>
          <DataTable
            columns={allColumns}
            rows={items}
            getKey={(row) => row.id}
            isLoading={isPending}
            skeletonRows={6}
            emptyText="No hay registros con estos filtros."
            renderCard={renderCard}
          />

          {!isPending && total > 0 && (
            <Pagination
              page={state.page}
              pageSize={PAGE_SIZE}
              total={total}
              totalPages={totalPages}
              isFetching={isFetching}
              onPage={state.setPage}
            />
          )}
        </>
      )}
    </div>
  )
}
