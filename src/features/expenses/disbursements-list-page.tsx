import { useEffect, useMemo, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router'
import { Banknote, Plus } from 'lucide-react'
import type { SortingState } from '@tanstack/react-table'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import { ContactPicker } from '@/components/contact-picker'
import { Button } from '@/components/ui/button'
import { DataList, listColumns, RowChevron, type ActiveFilter } from '@/components/ui/data-list'
import { NativeSelect } from '@/components/ui/native-select'
import { StatusBadge } from '@/components/ui/status-badge'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState, NoResults } from '@/components/ui/empty-state'
import { useContacts } from '@/features/contacts/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canEditContacts } from '@/features/organizations/roles'
import { formatAmount, formatDateHuman } from '@/lib/format'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { cn } from '@/lib/utils'
import type {
  Disbursement,
  GetApiV1OrganizationsOrgIdDisbursementsParams,
  GetApiV1OrganizationsOrgIdDisbursementsSort,
} from '@/api/generated/model'
import { DISBURSEMENT_PURPOSE_LABELS, disbursementStatus } from './labels'
import { useDisbursements } from './hooks'

type StatusFilter = '' | 'POSTED' | 'REVERSED'
type PurposeFilter = '' | 'EXPENSE' | 'ADVANCE' | 'DIRECT_EXPENSE'
const PAGE_SIZE = 20

/** Columnas ordenables que acepta el endpoint (contrato: ListDisbursementsQuery). */
const SORT_OPTIONS = [
  { field: 'disbursedAt', label: 'Fecha' },
  { field: 'amount', label: 'Monto' },
]

const column = listColumns<Disbursement>()

export function DisbursementsListPage() {
  const { orgId, role } = useCurrentOrg()
  const canRegister = canEditContacts(role)
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const q = useDebouncedValue(search.trim(), 300)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'disbursedAt', desc: true }])
  const [supplierId, setSupplierId] = useState<string | null>(null)
  const [status, setStatus] = useState<StatusFilter>('')
  const [purpose, setPurpose] = useState<PurposeFilter>('')
  const [page, setPage] = useState(1)

  // Cualquier cambio de criterio devuelve a la primera página: la página 3 de
  // un resultado distinto no significa nada.
  useEffect(() => {
    setPage(1)
  }, [q, supplierId, status, purpose, sorting])

  const active = sorting[0]
  const params: GetApiV1OrganizationsOrgIdDisbursementsParams = {
    page,
    pageSize: PAGE_SIZE,
    q: q || undefined,
    sort: active?.id as GetApiV1OrganizationsOrgIdDisbursementsSort | undefined,
    order: active?.desc ? 'desc' : 'asc',
    supplierContactId: supplierId || undefined,
    status: status || undefined,
    purpose: purpose || undefined,
  }
  const { items, total, totalPages, isPending, isError, error, isFetching } = useDisbursements(
    orgId,
    params,
  )

  const { contacts } = useContacts(orgId, { page: 1, pageSize: 100, sort: 'name', order: 'asc' })
  const contactMap = useMemo(() => new Map(contacts.map((c) => [c.id, c.displayName])), [contacts])

  const columns = useMemo(() => {
    const supplierName = (id?: string | null) => (id ? (contactMap.get(id) ?? '—') : '—')
    return column.columns([
      column.display({
        id: 'supplier',
        header: 'Proveedor',
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{supplierName(row.original.supplierContactId)}</p>
            <p className="text-muted-foreground truncate text-xs">
              {DISBURSEMENT_PURPOSE_LABELS[row.original.purpose] ?? row.original.purpose}
            </p>
          </div>
        ),
      }),
      column.display({
        id: 'disbursedAt',
        header: 'Fecha',
        cell: ({ row }) => (
          <span className="nums text-muted-foreground">
            {formatDateHuman(row.original.disbursedAt)}
          </span>
        ),
      }),
      column.display({
        id: 'status',
        header: 'Estado',
        cell: ({ row }) => <StatusBadge {...disbursementStatus(row.original.status)} />,
      }),
      column.display({
        id: 'amount',
        header: 'Monto',
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span
            className={cn(
              row.original.status === 'REVERSED' && 'text-muted-foreground line-through',
            )}
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
    ])
  }, [contactMap])

  const activeFilters = [
    q && { id: 'q', label: `Busca: ${q}`, onRemove: () => setSearch('') },
    status && { id: 'status', label: disbursementStatus(status).label, onRemove: () => setStatus('') },
    purpose && { id: 'purpose', label: DISBURSEMENT_PURPOSE_LABELS[purpose] ?? purpose, onRemove: () => setPurpose('') },
    supplierId && { id: 'supplier', label: 'Proveedor filtrado', onRemove: () => setSupplierId(null) },
  ].filter(Boolean) as ActiveFilter[]

  const hasFilters = Boolean(q) || supplierId !== null || status !== '' || purpose !== ''
  const clearFilters = () => {
    setSearch('')
    setSupplierId(null)
    setStatus('')
    setPurpose('')
  }

  return (
    <div>
      <PageHeader title="Egresos" description="Salidas de dinero y su aplicación a los gastos.">
        {canRegister && (
          <Button asChild size="sm">
            <Link to="/gastos/egresos/nuevo">
              <Plus className="size-4" />
              Registrar egreso
            </Link>
          </Button>
        )}
      </PageHeader>

      {isError ? (
        <ErrorState error={error} fallback="No se pudieron cargar los egresos." />
      ) : (
        <>
          <DataList
            columns={columns}
            rows={items}
            getRowId={(d) => d.id}
            onRowClick={(d) => navigate(`/gastos/egresos/${d.id}`)}
            isLoading={isPending}
            activeFilters={activeFilters}
            onClearFilters={clearFilters}
            emptyText={
              hasFilters ? (
                <NoResults entity="egresos" onClear={clearFilters} />
              ) : (
                <EmptyState
                  Icon={Banknote}
                  title="Todavía no has registrado egresos"
                  description="Un egreso es dinero que sale: el pago de un gasto, un anticipo a un proveedor o un gasto directo."
                />
              )
            }
            search={{
              value: search,
              onChange: setSearch,
              placeholder: 'Buscar por proveedor o referencia…',
            }}
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
                  className="w-40"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value as PurposeFilter)}
                  aria-label="Propósito"
                >
                  <option value="">Todos</option>
                  <option value="EXPENSE">Pago de gasto</option>
                  <option value="ADVANCE">Anticipo</option>
                  <option value="DIRECT_EXPENSE">Egreso directo</option>
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
