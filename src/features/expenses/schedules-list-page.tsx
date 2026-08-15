import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { ChevronRight, Plus } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import { SearchInput } from '@/components/search-input'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/ui/data-table'
import { useContacts } from '@/features/contacts/hooks'
import { useExpenseCategories } from '@/features/masters/hooks'
import { useMasterListState } from '@/features/masters/master-crud'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canManageAgreements } from '@/features/organizations/roles'
import { getErrorMessage } from '@/lib/errors'
import { formatAmount } from '@/lib/format'
import { cn } from '@/lib/utils'
import { RECURRENCE_LABELS, SCHEDULE_STATUS_LABELS, TONE_DOT, scheduleStatusTone } from './labels'
import { useExpenseSchedules } from './hooks'

export function ScheduleStatusPill({ status }: { status: string }) {
  const tone = scheduleStatusTone(status)
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm">
      <span className={cn('size-1.5 rounded-full', TONE_DOT[tone])} />
      {SCHEDULE_STATUS_LABELS[status] ?? status}
    </span>
  )
}

export function SchedulesListPage() {
  const { orgId, role } = useCurrentOrg()
  const canManage = canManageAgreements(role)
  const navigate = useNavigate()
  const state = useMasterListState()

  const { items, total, totalPages, isPending, isError, error, isFetching } = useExpenseSchedules(orgId, {
    page: state.params.page,
    pageSize: state.params.pageSize,
    q: state.params.q,
    sort: 'createdAt',
    order: 'desc',
  })

  const { contacts } = useContacts(orgId, { page: 1, pageSize: 100, sort: 'name', order: 'asc' })
  const { items: categories } = useExpenseCategories(orgId, { page: 1, pageSize: 100, sort: 'name', order: 'asc' })
  const contactMap = useMemo(() => new Map(contacts.map((c) => [c.id, c.displayName])), [contacts])
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories])

  type Row = (typeof items)[number]
  const columns: Column<Row>[] = [
    {
      header: 'Proveedor',
      cell: (s) => (
        <>
          {contactMap.get(s.supplierContactId) ?? '—'}
          {s.name && <span className="block text-xs font-normal text-muted-foreground">{s.name}</span>}
        </>
      ),
      className: 'font-medium',
    },
    { header: 'Categoría', cell: (s) => categoryMap.get(s.expenseCategoryId) ?? '—', className: 'text-muted-foreground' },
    {
      header: 'Monto',
      cell: (s) => formatAmount(s.agreedAmount, s.currency),
      className: 'nums text-right',
      headClassName: 'text-right',
    },
    {
      header: 'Recurrencia',
      cell: (s) => `${RECURRENCE_LABELS[s.recurrenceType] ?? s.recurrenceType} · día ${s.dueDay}`,
      className: 'text-muted-foreground',
    },
    { header: 'Estado', cell: (s) => <ScheduleStatusPill status={s.status} /> },
    { header: '', cell: () => <ChevronRight className="size-4 text-muted-foreground" />, className: 'w-8', cardHidden: true },
  ]
  const renderCard = (s: Row) => (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate font-medium">{contactMap.get(s.supplierContactId) ?? '—'}</span>
        <span className="nums shrink-0 font-medium">{formatAmount(s.agreedAmount, s.currency)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span>{categoryMap.get(s.expenseCategoryId) ?? '—'}</span>
        <span aria-hidden>·</span>
        <span>día {s.dueDay}</span>
        <span aria-hidden>·</span>
        <ScheduleStatusPill status={s.status} />
      </div>
    </div>
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

      <div className="mb-4">
        <SearchInput value={state.search} onChange={state.setSearch} placeholder="Buscar…" className="sm:max-w-xs" />
      </div>

      {isError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {getErrorMessage(error, 'No se pudieron cargar.')}
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={items}
            getKey={(s) => s.id}
            onRowClick={(s) => navigate(`/gastos/recurrentes/${s.id}`)}
            isLoading={isPending}
            skeletonRows={6}
            emptyText="No hay gastos recurrentes."
            renderCard={renderCard}
          />

          {!isPending && total > 0 && (
            <Pagination page={state.page} pageSize={state.params.pageSize} total={total} totalPages={totalPages} isFetching={isFetching} onPage={state.setPage} />
          )}
        </>
      )}
    </div>
  )
}
