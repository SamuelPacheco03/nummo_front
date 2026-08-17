import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Percent, Plus, RefreshCw } from 'lucide-react'
import type { SortingState } from '@tanstack/react-table'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import { ContactPicker } from '@/components/contact-picker'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { NativeSelect } from '@/components/ui/native-select'
import { DataList, listColumns, RowChevron } from '@/components/ui/data-list'
import { StatusBadge } from '@/components/ui/status-badge'
import { useContacts } from '@/features/contacts/hooks'
import { useBillingConcepts } from '@/features/masters/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canEditContacts, canManageAgreements } from '@/features/organizations/roles'
import { getErrorMessage } from '@/lib/errors'
import { formatAmount, formatDateHuman } from '@/lib/format'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import type {
  AccrueInterestResult,
  GenerateReceivablesResult,
  GetApiV1OrganizationsOrgIdReceivablesParams,
  GetApiV1OrganizationsOrgIdReceivablesSort,
  ReceivableBalance,
} from '@/api/generated/model'
import { receivableStatus } from './labels'
import { CreateReceivableDialog } from './create-receivable-dialog'
import { useAccrueInterest, useGenerateReceivables, useReceivables } from './hooks'

type StatusFilter = '' | 'PENDING' | 'PARTIAL' | 'OVERDUE' | 'PAID' | 'CANCELLED' | 'WRITTEN_OFF'
const PAGE_SIZE = 20

/** Columnas ordenables que acepta el endpoint (contrato: ListReceivablesQuery). */
const SORT_OPTIONS = [
  { field: 'dueDate', label: 'Vencimiento' },
  { field: 'balance', label: 'Saldo' },
  { field: 'originalAmount', label: 'Valor original' },
]

const column = listColumns<ReceivableBalance>()

export function ReceivablesListPage() {
  const { orgId, role } = useCurrentOrg()
  const canGenerate = canManageAgreements(role)
  const canCreate = canEditContacts(role)
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const q = useDebouncedValue(search.trim(), 300)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'dueDate', desc: false }])
  const [status, setStatus] = useState<StatusFilter>('')
  const [payerId, setPayerId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)

  // Cualquier cambio de criterio devuelve a la primera página.
  useEffect(() => {
    setPage(1)
  }, [q, status, payerId, sorting])

  const active = sorting[0]
  const params: GetApiV1OrganizationsOrgIdReceivablesParams = {
    page,
    pageSize: PAGE_SIZE,
    q: q || undefined,
    sort: active?.id as GetApiV1OrganizationsOrgIdReceivablesSort | undefined,
    order: active?.desc ? 'desc' : 'asc',
    displayStatus: status || undefined,
    payerContactId: payerId || undefined,
  }
  const { items, total, totalPages, isPending, isError, error, isFetching } = useReceivables(orgId, params)

  const { contacts } = useContacts(orgId, { page: 1, pageSize: 100, sort: 'name', order: 'asc' })
  const { items: concepts } = useBillingConcepts(orgId, { page: 1, pageSize: 100, sort: 'name', order: 'asc' })
  const contactMap = useMemo(() => new Map(contacts.map((c) => [c.id, c.displayName])), [contacts])
  const conceptMap = useMemo(() => new Map(concepts.map((c) => [c.id, c.name])), [concepts])

  const columns = useMemo(
    () =>
      column.columns([
        column.display({
          id: 'payer',
          header: 'Pagador',
          cell: ({ row }) => (
            <div className="min-w-0">
              <p className="truncate font-medium">
                {contactMap.get(row.original.payerContactId) ?? '—'}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {conceptMap.get(row.original.billingConceptId) ?? '—'}
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
          cell: ({ row }) => <StatusBadge {...receivableStatus(row.original.displayStatus)} />,
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
    [contactMap, conceptMap],
  )

  const generate = useGenerateReceivables(orgId ?? '')
  const onGenerate = async () => {
    try {
      const res = await generate.mutateAsync({ orgId: orgId ?? '' })
      const r = res.data as GenerateReceivablesResult
      toast.success(`${r.created} generadas · ${r.skipped} ya existían`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudieron generar'))
    }
  }

  const accrue = useAccrueInterest(orgId ?? '')
  const onAccrue = async () => {
    try {
      const res = await accrue.mutateAsync({ orgId: orgId ?? '' })
      const r = res.data as AccrueInterestResult
      toast.success(`Mora causada: ${r.charged} cargo(s) · ${formatAmount(r.chargedAmount)}`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo causar la mora'))
    }
  }

  return (
    <div>
      <PageHeader title="Cuentas por cobrar" description="Obligaciones de los pagadores.">
        {canGenerate && (
          <Button variant="outline" size="sm" onClick={onGenerate} disabled={generate.isPending}>
            {generate.isPending ? <Loader size="sm" /> : <RefreshCw className="size-4" />}
            Generar mensualidades
          </Button>
        )}
        {canGenerate && (
          <Button variant="outline" size="sm" onClick={onAccrue} disabled={accrue.isPending}>
            {accrue.isPending ? <Loader size="sm" /> : <Percent className="size-4" />}
            Causar mora
          </Button>
        )}
        {canCreate && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Nueva cuenta
          </Button>
        )}
      </PageHeader>

      {isError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {getErrorMessage(error, 'No se pudieron cargar las cuentas por cobrar.')}
        </div>
      ) : (
        <>
          <DataList
            columns={columns}
            rows={items}
            getRowId={(r) => r.receivableId}
            onRowClick={(r) => navigate(`/cartera/cxc/${r.receivableId}`)}
            isLoading={isPending}
            emptyText="No hay cuentas por cobrar con estos filtros."
            search={{ value: search, onChange: setSearch, placeholder: 'Buscar por pagador…' }}
            sort={{ value: sorting, onChange: setSorting, options: SORT_OPTIONS }}
            filters={
              <>
                <div className="w-full sm:w-56">
                  <ContactPicker
                    orgId={orgId ?? ''}
                    value={payerId}
                    onChange={setPayerId}
                    allowClear
                    placeholder="Pagador…"
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
                  <option value="OVERDUE">Vencida</option>
                  <option value="PAID">Pagada</option>
                  <option value="CANCELLED">Cancelada</option>
                  <option value="WRITTEN_OFF">Castigada</option>
                </NativeSelect>
              </>
            }
          />

          {!isPending && total > 0 && (
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              totalPages={totalPages}
              isFetching={isFetching}
              onPage={setPage}
            />
          )}
        </>
      )}

      {orgId && <CreateReceivableDialog orgId={orgId} open={createOpen} onOpenChange={setCreateOpen} />}
    </div>
  )
}
