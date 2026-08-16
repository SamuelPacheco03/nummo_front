import { useEffect, useMemo, useState } from 'react'
import { Outlet, useNavigate } from 'react-router'
import { Loader2, Plus, RefreshCw } from 'lucide-react'
import type { SortingState } from '@tanstack/react-table'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import { ContactPicker } from '@/components/contact-picker'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { DataList, listColumns, RowChevron } from '@/components/ui/data-list'
import { useContacts } from '@/features/contacts/hooks'
import { useExpenseCategories } from '@/features/masters/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canEditContacts, canManageAgreements } from '@/features/organizations/roles'
import { getErrorMessage } from '@/lib/errors'
import { formatAmount, formatDateHuman } from '@/lib/format'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { cn } from '@/lib/utils'
import type {
  ExpenseBalance,
  GenerateExpensesResult,
  GetApiV1OrganizationsOrgIdExpensesParams,
  GetApiV1OrganizationsOrgIdExpensesSort,
} from '@/api/generated/model'
import { EXPENSE_STATUS_LABELS, TONE_DOT, expenseStatusTone } from './labels'
import { CreateExpenseDialog } from './create-expense-dialog'
import { useExpenses, useGenerateExpenses } from './hooks'

type StatusFilter = '' | 'PENDING' | 'PARTIAL' | 'OVERDUE' | 'PAID' | 'CANCELLED' | 'WRITTEN_OFF'
const PAGE_SIZE = 20

/** Columnas ordenables que acepta el endpoint (contrato: ListExpensesQuery). */
const SORT_OPTIONS = [
  { field: 'dueDate', label: 'Vencimiento' },
  { field: 'balance', label: 'Saldo' },
  { field: 'originalAmount', label: 'Valor original' },
]

const column = listColumns<ExpenseBalance>()

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

  const [search, setSearch] = useState('')
  const q = useDebouncedValue(search.trim(), 300)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'dueDate', desc: false }])
  const [status, setStatus] = useState<StatusFilter>('')
  const [supplierId, setSupplierId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)

  // Cualquier cambio de criterio devuelve a la primera página.
  useEffect(() => {
    setPage(1)
  }, [q, status, supplierId, sorting])

  const active = sorting[0]
  const params: GetApiV1OrganizationsOrgIdExpensesParams = {
    page,
    pageSize: PAGE_SIZE,
    q: q || undefined,
    sort: active?.id as GetApiV1OrganizationsOrgIdExpensesSort | undefined,
    order: active?.desc ? 'desc' : 'asc',
    displayStatus: status || undefined,
    supplierContactId: supplierId || undefined,
  }
  const { items, total, totalPages, isPending, isError, error, isFetching } = useExpenses(orgId, params)

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
                {categoryMap.get(row.original.expenseCategoryId) ?? '—'}
              </p>
            </div>
          ),
        }),
        column.display({
          id: 'dueDate',
          header: 'Vence',
          cell: ({ row }) => (
            <span className="nums text-muted-foreground">
              {formatDateHuman(row.original.dueDate)}
            </span>
          ),
        }),
        column.display({
          id: 'status',
          header: 'Estado',
          cell: ({ row }) => <ExpenseStatusPill status={row.original.displayStatus} />,
        }),
        column.display({
          id: 'balance',
          header: 'Saldo',
          meta: { align: 'right' },
          cell: ({ row }) => formatAmount(row.original.balance, row.original.currency),
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

      {isError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {getErrorMessage(error, 'No se pudieron cargar los gastos.')}
        </div>
      ) : (
        <>
          <DataList
            columns={columns}
            rows={items}
            getRowId={(e) => e.expenseId}
            onRowClick={(e) => navigate(`/gastos/cxp/${e.expenseId}`)}
            isLoading={isPending}
            emptyText="No hay gastos con estos filtros."
            search={{ value: search, onChange: setSearch, placeholder: 'Buscar por proveedor…' }}
            sort={{ value: sorting, onChange: setSorting, options: SORT_OPTIONS }}
            filters={
              <>
                <div className="w-full sm:w-56">
                  <ContactPicker
                    orgId={orgId ?? ''}
                    value={supplierId}
                    onChange={setSupplierId}
                    allowClear
                    placeholder="Proveedor…"
                  />
                </div>
                <NativeSelect
                  className="w-44"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StatusFilter)}
                  aria-label="Estado"
                >
                  <option value="">Todos los estados</option>
                  <option value="PENDING">Pendiente</option>
                  <option value="PARTIAL">Parcial</option>
                  <option value="OVERDUE">Vencido</option>
                  <option value="PAID">Pagado</option>
                  <option value="CANCELLED">Cancelado</option>
                  <option value="WRITTEN_OFF">Castigado</option>
                </NativeSelect>
              </>
            }
          />

          {!isPending && total > 0 && (
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} totalPages={totalPages} isFetching={isFetching} onPage={setPage} />
          )}
        </>
      )}

      {orgId && <CreateExpenseDialog orgId={orgId} open={createOpen} onOpenChange={setCreateOpen} />}

      {/* Detalle en cajón: ruta hija, la lista se queda montada detrás. */}
      <Outlet />
    </div>
  )
}
