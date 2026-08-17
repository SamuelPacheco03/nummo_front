import { useMemo } from 'react'
import { Link, Outlet, useNavigate } from 'react-router'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import { Button } from '@/components/ui/button'
import { DataList, listColumns, RowChevron } from '@/components/ui/data-list'
import { StatusBadge } from '@/components/ui/status-badge'
import { useContacts } from '@/features/contacts/hooks'
import { useExpenseCategories } from '@/features/masters/hooks'
import { useMasterListState } from '@/features/masters/master-crud'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canManageAgreements } from '@/features/organizations/roles'
import { getErrorMessage } from '@/lib/errors'
import { formatAmount } from '@/lib/format'
import { RECURRENCE_LABELS, scheduleStatus } from './labels'
import type { ExpenseSchedule } from '@/api/generated/model'
import { useExpenseSchedules } from './hooks'

/** Columnas ordenables que acepta el endpoint (contrato: NamedListQuery). */
const SORT_OPTIONS = [
  { field: 'createdAt', label: 'Creación' },
  { field: 'name', label: 'Nombre' },
]

const column = listColumns<ExpenseSchedule>()

export function SchedulesListPage() {
  const { orgId, role } = useCurrentOrg()
  const canManage = canManageAgreements(role)
  const navigate = useNavigate()
  const state = useMasterListState()

  const { items, total, totalPages, isPending, isError, error, isFetching } = useExpenseSchedules(orgId, {
    page: state.params.page,
    pageSize: state.params.pageSize,
    q: state.params.q,
    sort: state.params.sort,
    order: state.params.order,
  })

  const { contacts } = useContacts(orgId, { page: 1, pageSize: 100, sort: 'name', order: 'asc' })
  const { items: categories } = useExpenseCategories(orgId, { page: 1, pageSize: 100, sort: 'name', order: 'asc' })
  const contactMap = useMemo(() => new Map(contacts.map((c) => [c.id, c.displayName])), [contacts])
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories])

  const columns = useMemo(
    () =>
      column.columns([
        column.display({
          id: 'supplier',
          header: 'Proveedor',
          cell: ({ row }) => (
            <div className="min-w-0">
              <p className="truncate font-medium">
                {contactMap.get(row.original.supplierContactId) ?? '—'}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {row.original.name ?? categoryMap.get(row.original.expenseCategoryId) ?? '—'}
              </p>
            </div>
          ),
        }),
        column.display({
          id: 'recurrence',
          header: 'Recurrencia',
          cell: ({ row }) => (
            <span className="text-muted-foreground">
              {RECURRENCE_LABELS[row.original.recurrenceType] ?? row.original.recurrenceType} · día{' '}
              {row.original.dueDay}
            </span>
          ),
        }),
        column.display({
          id: 'status',
          header: 'Estado',
          cell: ({ row }) => <StatusBadge {...scheduleStatus(row.original.status)} />,
        }),
        column.display({
          id: 'amount',
          header: 'Monto',
          meta: { align: 'right' },
          cell: ({ row }) => formatAmount(row.original.agreedAmount, row.original.currency),
        }),
        column.display({
          id: 'chevron',
          header: '',
          meta: { hideOnStack: true },
          cell: () => <RowChevron />,
        }),
      ]),
    [contactMap, categoryMap],
  )

  return (
    <div>
      <PageHeader title="Gastos recurrentes" description="Pagos periódicos a proveedores por categoría.">
        {canManage && (
          <Button asChild size="sm">
            <Link to="/gastos/recurrentes/nuevo">
              <Plus className="size-4" />
              Nuevo recurrente
            </Link>
          </Button>
        )}
      </PageHeader>

      {isError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {getErrorMessage(error, 'No se pudieron cargar.')}
        </div>
      ) : (
        <>
          <DataList
            columns={columns}
            rows={items}
            getRowId={(s) => s.id}
            onRowClick={(s) => navigate(`/gastos/recurrentes/${s.id}`)}
            isLoading={isPending}
            skeletonRows={6}
            emptyText="No hay gastos recurrentes."
            search={{ value: state.search, onChange: state.setSearch, placeholder: 'Buscar recurrente…' }}
            sort={{ value: state.sorting, onChange: state.setSorting, options: SORT_OPTIONS }}
          />

          {!isPending && total > 0 && (
            <Pagination page={state.page} pageSize={state.params.pageSize} total={total} totalPages={totalPages} isFetching={isFetching} onPage={state.setPage} />
          )}
        </>
      )}

      {/* Detalle en cajón: ruta hija, la lista se queda montada detrás. */}
      <Outlet />
    </div>
  )
}
