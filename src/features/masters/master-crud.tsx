import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { SortingState } from '@tanstack/react-table'
import { Pencil, Plus } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { DataList, listColumns } from '@/components/ui/data-list'
import { StatusDot } from '@/components/ui/status-badge'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState, NoResults } from '@/components/ui/empty-state'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import type { MasterParams } from './hooks'

const PAGE_SIZE = 20

/** Los maestros solo ordenan por estas dos, según el contrato (NamedListQuery). */
const SORT_OPTIONS = [
  { field: 'name', label: 'Nombre' },
  { field: 'createdAt', label: 'Creación' },
]

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
  sorting: SortingState
  setSorting: (value: SortingState) => void
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
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }])
  const [active, setActive] = useState<'' | 'true' | 'false'>('true')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [q, active, sorting])

  const params: MasterParams = {
    page,
    pageSize: PAGE_SIZE,
    q: q || undefined,
    isActive: active || undefined,
    sort: (sorting[0]?.id ?? 'name') as MasterParams['sort'],
    order: sorting[0]?.desc ? 'desc' : 'asc',
  }

  return { sorting, setSorting, search, setSearch, active, setActive, page, setPage, params }
}

/** Listado CRUD genérico de maestros (presentacional): filtros + filas-tarjeta + paginación. */
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
  const column = listColumns<T>()
  const allColumns = useMemo(
    () =>
      column.columns([
        ...columns.map((c, i) =>
          column.display({
            id: `col-${i}`,
            header: c.header,
            cell: ({ row }) =>
              i === 0 ? <span className="font-medium">{c.cell(row.original)}</span> : c.cell(row.original),
          }),
        ),
        column.display({
          id: 'status',
          header: 'Estado',
          cell: ({ row }) => <StatusDot active={row.original.isActive} />,
        }),
        ...(canManage
          ? [
              column.display({
                id: 'edit',
                header: '',
                meta: { hideOnStack: true },
                cell: ({ row }) => editButton(row.original),
              }),
            ]
          : []),
      ]),
    // Las props columns y editButton se recrean en cada render del padre; lo
    // que de verdad cambia el modelo es cuántas columnas hay y si se edita.
    [columns.length, canManage],
  )

  const hasFilters = Boolean(state.search) || state.active !== 'true'
  const clearFilters = () => {
    state.setSearch('')
    state.setActive('true')
  }

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

      {isError ? (
        <ErrorState error={error} fallback="No se pudo cargar la información." />
      ) : (
        <>
          <DataList
            columns={allColumns}
            rows={items}
            getRowId={(row) => row.id}
            isLoading={isPending}
            skeletonRows={6}
            emptyText={
              hasFilters ? (
                <NoResults entity={title.toLowerCase()} onClear={clearFilters} />
              ) : (
                <EmptyState
                  title={`Todavía no tienes ${title.toLowerCase()}`}
                  description={description}
                  action={
                    canManage && (
                      <Button size="sm" onClick={onNew}>
                        <Plus className="size-4" />
                        {newLabel}
                      </Button>
                    )
                  }
                />
              )
            }
            search={{ value: state.search, onChange: state.setSearch, placeholder: searchPlaceholder }}
            sort={{ value: state.sorting, onChange: state.setSorting, options: SORT_OPTIONS }}
            filters={
              <NativeSelect
                className="w-32"
                value={state.active}
                onChange={(e) => state.setActive(e.target.value as '' | 'true' | 'false')}
                aria-label="Estado"
              >
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
                <option value="">Todos</option>
              </NativeSelect>
            }
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
