import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { ChevronRight, Loader2, Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import { ContactPicker } from '@/components/contact-picker'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { DataTable, type Column } from '@/components/ui/data-table'
import { useContacts } from '@/features/contacts/hooks'
import { useExpenseCategories } from '@/features/masters/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canEditContacts, canManageAgreements } from '@/features/organizations/roles'
import { getErrorMessage } from '@/lib/errors'
import { formatAmount, formatDateHuman } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { GenerateExpensesResult, GetApiV1OrganizationsOrgIdExpensesParams } from '@/api/generated/model'
import { EXPENSE_STATUS_LABELS, TONE_DOT, expenseStatusTone } from './labels'
import { CreateExpenseDialog } from './create-expense-dialog'
import { useExpenses, useGenerateExpenses } from './hooks'

type StatusFilter = '' | 'PENDING' | 'PARTIAL' | 'OVERDUE' | 'PAID' | 'CANCELLED' | 'WRITTEN_OFF'
const PAGE_SIZE = 20

export function ExpenseStatusPill({ status }: { status: string }) {
  const tone = expenseStatusTone(status)
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm">
      <span className={cn('size-1.5 rounded-full', TONE_DOT[tone])} />
      {EXPENSE_STATUS_LABELS[status] ?? status}
    </span>
  )
}

export function ExpensesListPage() {
  const { orgId, role } = useCurrentOrg()
  const canGenerate = canManageAgreements(role)
  const canCreate = canEditContacts(role)
  const navigate = useNavigate()

  const [status, setStatus] = useState<StatusFilter>('')
  const [supplierId, setSupplierId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    setPage(1)
  }, [status, supplierId])

  const params: GetApiV1OrganizationsOrgIdExpensesParams = {
    page,
    pageSize: PAGE_SIZE,
    displayStatus: status || undefined,
    supplierContactId: supplierId || undefined,
    order: 'asc',
  }
  const { items, total, totalPages, isPending, isError, error, isFetching } = useExpenses(orgId, params)

  const { contacts } = useContacts(orgId, { page: 1, pageSize: 100, sort: 'name', order: 'asc' })
  const { items: categories } = useExpenseCategories(orgId, { page: 1, pageSize: 100, sort: 'name', order: 'asc' })
  const contactMap = useMemo(() => new Map(contacts.map((c) => [c.id, c.displayName])), [contacts])
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories])

  type Row = (typeof items)[number]
  const columns: Column<Row>[] = [
    { header: 'Proveedor', cell: (e) => contactMap.get(e.supplierContactId) ?? '—', className: 'font-medium' },
    { header: 'Categoría', cell: (e) => categoryMap.get(e.expenseCategoryId) ?? '—', className: 'text-muted-foreground' },
    { header: 'Vence', cell: (e) => formatDateHuman(e.dueDate), className: 'nums text-muted-foreground' },
    {
      header: 'Saldo',
      cell: (e) => formatAmount(e.balance, e.currency),
      className: 'nums text-right font-medium',
      headClassName: 'text-right',
    },
    { header: 'Estado', cell: (e) => <ExpenseStatusPill status={e.displayStatus} /> },
    { header: '', cell: () => <ChevronRight className="size-4 text-muted-foreground" />, className: 'w-8', cardHidden: true },
  ]
  const renderCard = (e: Row) => (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate font-medium">{contactMap.get(e.supplierContactId) ?? '—'}</span>
        <span className="nums shrink-0 font-medium">{formatAmount(e.balance, e.currency)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span>{categoryMap.get(e.expenseCategoryId) ?? '—'}</span>
        <span aria-hidden>·</span>
        <span className="nums">Vence {formatDateHuman(e.dueDate)}</span>
        <span aria-hidden>·</span>
        <ExpenseStatusPill status={e.displayStatus} />
      </div>
    </div>
  )

  const generate = useGenerateExpenses(orgId ?? '')
  const onGenerate = async () => {
    try {
      const res = await generate.mutateAsync({ orgId: orgId ?? '' })
      const r = res.data as GenerateExpensesResult
      toast.success(`${r.created} generados · ${r.skipped} ya existían`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudieron generar'))
    }
  }

  return (
    <div>
      <PageHeader title="Cuentas por pagar" description="Gastos y obligaciones con proveedores.">
        {canGenerate && (
          <Button variant="outline" size="sm" onClick={onGenerate} disabled={generate.isPending}>
            {generate.isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Generar gastos
          </Button>
        )}
        {canCreate && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Nuevo gasto
          </Button>
        )}
      </PageHeader>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="sm:w-64">
          <ContactPicker orgId={orgId ?? ''} value={supplierId} onChange={setSupplierId} allowClear placeholder="Filtrar por proveedor…" />
        </div>
        <NativeSelect className="w-44 sm:ml-auto" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} aria-label="Estado">
          <option value="">Todos los estados</option>
          <option value="PENDING">Pendiente</option>
          <option value="PARTIAL">Parcial</option>
          <option value="OVERDUE">Vencido</option>
          <option value="PAID">Pagado</option>
          <option value="CANCELLED">Cancelado</option>
          <option value="WRITTEN_OFF">Castigado</option>
        </NativeSelect>
      </div>

      {isError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {getErrorMessage(error, 'No se pudieron cargar los gastos.')}
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={items}
            getKey={(e) => e.expenseId}
            onRowClick={(e) => navigate(`/gastos/cxp/${e.expenseId}`)}
            isLoading={isPending}
            skeletonRows={8}
            emptyText="No hay gastos con estos filtros."
            renderCard={renderCard}
          />

          {!isPending && total > 0 && (
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} totalPages={totalPages} isFetching={isFetching} onPage={setPage} />
          )}
        </>
      )}

      {orgId && <CreateExpenseDialog orgId={orgId} open={createOpen} onOpenChange={setCreateOpen} />}
    </div>
  )
}
