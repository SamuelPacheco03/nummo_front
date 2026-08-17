import { useMemo, useRef } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { DataList } from '@/components/ui/data-list'
import { listColumns } from '@/components/ui/list-columns'
import { StatusDot } from '@/components/ui/status-badge'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState, NoResults } from '@/components/ui/empty-state'
import {
  MASTER_PAGE_SIZE,
  type Column,
  type ListResult,
  type MasterListState,
} from './master-list-state'

/** Los maestros solo ordenan por estas dos, según el contrato (NamedListQuery). */
const SORT_OPTIONS = [
  { field: 'name', label: 'Nombre' },
  { field: 'createdAt', label: 'Creación' },
]

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

  /*
    `onEdit` se recrea en cada render del padre. Guardarlo en una ref permite
    memorizar las columnas por su identidad —lo correcto— sin quedarse con una
    versión vieja del callback.

    Antes se memorizaba por `columns.length`, y eso escondía un fallo real: una
    celda que cerrara sobre datos que llegan del API (el nombre de la sede en
    cuentas financieras) se quedaba congelada en su primer valor, porque el
    número de columnas nunca cambia. **Quien llame a `MasterCrud` debe pasar una
    lista de columnas estable** (constante de módulo o `useMemo`).
  */
  const onEditRef = useRef(onEdit)
  onEditRef.current = onEdit

  const column = useMemo(() => listColumns<T>(), [])
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
                cell: ({ row }) => (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => onEditRef.current(row.original)}
                    aria-label="Editar"
                  >
                    <Pencil className="size-4" />
                  </Button>
                ),
              }),
            ]
          : []),
      ]),
    [column, columns, canManage],
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
              pageSize={MASTER_PAGE_SIZE}
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
