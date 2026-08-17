import { useEffect, useMemo, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router'
import { FileText, Plus } from 'lucide-react'
import type { SortingState } from '@tanstack/react-table'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { DataList, RowChevron, type ActiveFilter } from '@/components/ui/data-list'
import { listColumns } from '@/components/ui/list-columns'
import { StatusBadge } from '@/components/ui/status-badge'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState, NoResults } from '@/components/ui/empty-state'
import { useContacts } from '@/features/contacts/hooks'
import { useBillingConcepts } from '@/features/masters/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canManageAgreements } from '@/features/organizations/roles'
import { formatAmount } from '@/lib/format'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import type {
  BillingAgreement,
  GetApiV1OrganizationsOrgIdBillingAgreementsParams,
  GetApiV1OrganizationsOrgIdBillingAgreementsSort,
} from '@/api/generated/model'
import { RECURRENCE_LABELS, agreementStatus } from './labels'
import { useAgreements } from './hooks'

type StatusFilter = '' | 'ACTIVE' | 'PAUSED' | 'ENDED' | 'CANCELLED'
const PAGE_SIZE = 20

/** Columnas ordenables que acepta el endpoint (contrato: NamedListQuery). */
const SORT_OPTIONS = [
  { field: 'createdAt', label: 'Creación' },
  { field: 'name', label: 'Nombre' },
]

const column = listColumns<BillingAgreement>()

export function AgreementsListPage() {
  const { orgId, role } = useCurrentOrg()
  const canManage = canManageAgreements(role)
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const q = useDebouncedValue(search.trim(), 300)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])
  const [status, setStatus] = useState<StatusFilter>('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [q, status, sorting])

  const active = sorting[0]
  const params: GetApiV1OrganizationsOrgIdBillingAgreementsParams = {
    page,
    pageSize: PAGE_SIZE,
    q: q || undefined,
    status: status || undefined,
    sort: active?.id as GetApiV1OrganizationsOrgIdBillingAgreementsSort | undefined,
    order: active?.desc ? 'desc' : 'asc',
  }
  const { items, total, totalPages, isPending, isError, error, isFetching } = useAgreements(orgId, params)

  // El API devuelve ids; resolvemos nombres con mapas (suficiente para el catálogo
  // de una org; a gran escala el backend debería denormalizar en el listado).
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
                {row.original.name ?? conceptMap.get(row.original.billingConceptId) ?? '—'}
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
          cell: ({ row }) => <StatusBadge {...agreementStatus(row.original.status)} />,
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
    [contactMap, conceptMap],
  )

  const activeFilters = [
    q && { id: 'q', label: `Busca: ${q}`, onRemove: () => setSearch('') },
    status && { id: 'status', label: agreementStatus(status).label, onRemove: () => setStatus('') },
  ].filter(Boolean) as ActiveFilter[]

  const hasFilters = Boolean(q) || status !== ''
  const clearFilters = () => {
    setSearch('')
    setStatus('')
  }

  return (
    <div>
      <PageHeader title="Acuerdos" description="Cobros recurrentes por concepto y pagador.">
        {canManage && (
          <Button asChild size="sm">
            <Link to="/cartera/acuerdos/nuevo">
              <Plus className="size-4" />
              Nuevo acuerdo
            </Link>
          </Button>
        )}
      </PageHeader>

      {isError ? (
        <ErrorState error={error} fallback="No se pudieron cargar los acuerdos." />
      ) : (
        <>
          <DataList
            columns={columns}
            rows={items}
            getRowId={(a) => a.id}
            onRowClick={(a) => navigate(`/cartera/acuerdos/${a.id}`)}
            isLoading={isPending}
            activeFilters={activeFilters}
            onClearFilters={clearFilters}
            emptyText={
              hasFilters ? (
                <NoResults entity="acuerdos" onClear={clearFilters} />
              ) : (
                <EmptyState
                  Icon={FileText}
                  title="Todavía no tienes acuerdos"
                  description="Un acuerdo es una plantilla de cobro recurrente: Nummo genera solo la cuenta por cobrar de cada período."
                />
              )
            }
            search={{ value: search, onChange: setSearch, placeholder: 'Buscar acuerdo…' }}
            sort={{ value: sorting, onChange: setSorting, options: SORT_OPTIONS }}
            filters={
              <NativeSelect
                className="w-40"
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusFilter)}
                aria-label="Estado"
              >
                <option value="">Todos los estados</option>
                <option value="ACTIVE">Activos</option>
                <option value="PAUSED">Pausados</option>
                <option value="ENDED">Finalizados</option>
                <option value="CANCELLED">Cancelados</option>
              </NativeSelect>
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

      {/* Alta y edición en cajón: rutas hijas, la lista se queda detrás. */}
      <Outlet />
    </div>
  )
}
