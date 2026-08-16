import { useEffect, useMemo, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router'
import { Plus } from 'lucide-react'
import type { SortingState } from '@tanstack/react-table'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import { ContactPicker } from '@/components/contact-picker'
import { Button } from '@/components/ui/button'
import { DataList, listColumns, RowChevron } from '@/components/ui/data-list'
import { NativeSelect } from '@/components/ui/native-select'
import { useContacts } from '@/features/contacts/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canEditContacts } from '@/features/organizations/roles'
import { getErrorMessage } from '@/lib/errors'
import { formatAmount, formatDateHuman } from '@/lib/format'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { cn } from '@/lib/utils'
import type {
  GetApiV1OrganizationsOrgIdPaymentsParams,
  GetApiV1OrganizationsOrgIdPaymentsSort,
  Payment,
} from '@/api/generated/model'
import { PAYMENT_PURPOSE_LABELS, PAYMENT_STATUS_LABELS } from './labels'
import { usePayments } from './hooks'

type StatusFilter = '' | 'POSTED' | 'REVERSED'
type PurposeFilter = '' | 'RECEIVABLE' | 'ADVANCE' | 'DIRECT_INCOME'
const PAGE_SIZE = 20

/** Columnas ordenables que acepta el endpoint (contract: ListPaymentsQuery). */
const SORT_OPTIONS = [
  { field: 'receivedAt', label: 'Fecha' },
  { field: 'amount', label: 'Monto' },
]

const column = listColumns<Payment>()

function StatusChip({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm whitespace-nowrap">
      <span
        className={cn(
          'size-1.5 rounded-full',
          status === 'REVERSED' ? 'bg-muted-foreground/40' : 'bg-success',
        )}
      />
      {PAYMENT_STATUS_LABELS[status] ?? status}
    </span>
  )
}

export function PaymentsListPage() {
  const { orgId, role } = useCurrentOrg()
  const canRegister = canEditContacts(role)
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const q = useDebouncedValue(search.trim(), 300)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'receivedAt', desc: true }])
  const [payerId, setPayerId] = useState<string | null>(null)
  const [status, setStatus] = useState<StatusFilter>('')
  const [purpose, setPurpose] = useState<PurposeFilter>('')
  const [page, setPage] = useState(1)

  // Cualquier cambio de criterio devuelve a la primera página: la página 3 de
  // un resultado distinto no significa nada.
  useEffect(() => {
    setPage(1)
  }, [q, payerId, status, purpose, sorting])

  const active = sorting[0]
  const params: GetApiV1OrganizationsOrgIdPaymentsParams = {
    page,
    pageSize: PAGE_SIZE,
    q: q || undefined,
    sort: active?.id as GetApiV1OrganizationsOrgIdPaymentsSort | undefined,
    order: active?.desc ? 'desc' : 'asc',
    payerContactId: payerId || undefined,
    status: status || undefined,
    purpose: purpose || undefined,
  }
  const { items, total, totalPages, isPending, isError, error, isFetching } = usePayments(orgId, params)

  const { contacts } = useContacts(orgId, { page: 1, pageSize: 100, sort: 'name', order: 'asc' })
  const contactMap = useMemo(() => new Map(contacts.map((c) => [c.id, c.displayName])), [contacts])
  const payerName = (id?: string | null) => (id ? (contactMap.get(id) ?? '—') : '—')

  const columns = useMemo(
    () =>
      column.columns([
        column.display({
          id: 'payer',
          header: 'Pagador',
          cell: ({ row }) => (
            <div className="min-w-0">
              <p className="truncate font-medium">{payerName(row.original.payerContactId)}</p>
              <p className="text-muted-foreground truncate text-xs">
                {PAYMENT_PURPOSE_LABELS[row.original.purpose] ?? row.original.purpose}
              </p>
            </div>
          ),
        }),
        column.display({
          id: 'receivedAt',
          header: 'Fecha',
          cell: ({ row }) => (
            <span className="nums text-muted-foreground">
              {formatDateHuman(row.original.receivedAt)}
            </span>
          ),
        }),
        column.display({
          id: 'status',
          header: 'Estado',
          cell: ({ row }) => <StatusChip status={row.original.status} />,
        }),
        column.display({
          id: 'amount',
          header: 'Monto',
          meta: { align: 'right' },
          cell: ({ row }) => (
            <span
              className={cn(row.original.status === 'REVERSED' && 'text-muted-foreground line-through')}
            >
              {formatAmount(row.original.amount)}
            </span>
          ),
        }),
        column.display({
          id: 'chevron',
          header: '',
          meta: { hideOnStack: true },
          cell: () => <RowChevron />,
        }),
      ]),
    // `payerName` depende del mapa de contactos, que sí cambia.
    [contactMap],
  )

  return (
    <div>
      <PageHeader title="Pagos" description="Ingresos recibidos y su aplicación a la cartera.">
        {canRegister && (
          <Button asChild size="sm">
            <Link to="/cartera/pagos/nuevo">
              <Plus className="size-4" />
              Registrar pago
            </Link>
          </Button>
        )}
      </PageHeader>

      {isError ? (
        <div className="border-destructive/40 bg-destructive/5 text-destructive rounded-lg border p-4 text-sm">
          {getErrorMessage(error, 'No se pudieron cargar los pagos.')}
        </div>
      ) : (
        <>
          <DataList
            columns={columns}
            rows={items}
            getRowId={(p) => p.id}
            onRowClick={(p) => navigate(`/cartera/pagos/${p.id}`)}
            isLoading={isPending}
            emptyText="No hay pagos con estos filtros."
            search={{
              value: search,
              onChange: setSearch,
              placeholder: 'Buscar por pagador o referencia…',
            }}
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
                  className="w-40"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value as PurposeFilter)}
                  aria-label="Propósito"
                >
                  <option value="">Todos</option>
                  <option value="RECEIVABLE">Abono a cuenta</option>
                  <option value="ADVANCE">Anticipo</option>
                  <option value="DIRECT_INCOME">Ingreso directo</option>
                </NativeSelect>
                <NativeSelect
                  className="w-36"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StatusFilter)}
                  aria-label="Estado"
                >
                  <option value="">Todos</option>
                  <option value="POSTED">Registrado</option>
                  <option value="REVERSED">Reversado</option>
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

      {/* Detalle en cajón: ruta hija, la lista se queda montada detrás. */}
      <Outlet />
    </div>
  )
}
