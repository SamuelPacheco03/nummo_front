import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Plus } from 'lucide-react'
import type { SortingState } from '@tanstack/react-table'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { DataList, listColumns, RowChevron } from '@/components/ui/data-list'
import { useContacts } from '@/features/contacts/hooks'
import { useBillingConcepts } from '@/features/masters/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canManageAgreements } from '@/features/organizations/roles'
import { getErrorMessage } from '@/lib/errors'
import { formatAmount } from '@/lib/format'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { cn } from '@/lib/utils'
import type {
  BillingAgreement,
  GetApiV1OrganizationsOrgIdBillingAgreementsParams,
  GetApiV1OrganizationsOrgIdBillingAgreementsSort,
} from '@/api/generated/model'
import { AGREEMENT_STATUS_LABELS, RECURRENCE_LABELS, agreementStatusTone } from './labels'
import { useAgreements } from './hooks'

type StatusFilter = '' | 'ACTIVE' | 'PAUSED' | 'ENDED' | 'CANCELLED'
const PAGE_SIZE = 20

/** Columnas ordenables que acepta el endpoint (contrato: NamedListQuery). */
const SORT_OPTIONS = [
  { field: 'createdAt', label: 'Creación' },
  { field: 'name', label: 'Nombre' },
]

const column = listColumns<BillingAgreement>()
const TONE_CLASS = { success: 'bg-success', warning: 'bg-warning', muted: 'bg-muted-foreground/40' }

function StatusPill({ status }: { status: string }) {
  const tone = agreementStatusTone(status)
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm">
      <span className={cn('size-1.5 rounded-full', TONE_CLASS[tone])} />
      {AGREEMENT_STATUS_LABELS[status] ?? status}
    </span>
  )
}

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
          meta: { grow: 2 },
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
          meta: { grow: 1 },
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
          meta: { grow: 1 },
          cell: ({ row }) => <StatusPill status={row.original.status} />,
        }),
        column.display({
          id: 'amount',
          header: 'Monto',
          meta: { grow: 1, align: 'right' },
          cell: ({ row }) => formatAmount(row.original.agreedAmount, row.original.currency),
        }),
        column.display({
          id: 'chevron',
          header: '',
          meta: { width: 'auto', hideOnStack: true },
          cell: () => <RowChevron />,
        }),
      ]),
    [contactMap, conceptMap],
  )

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
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {getErrorMessage(error, 'No se pudieron cargar los acuerdos.')}
        </div>
      ) : (
        <>
          <DataList
            columns={columns}
            rows={items}
            getRowId={(a) => a.id}
            onRowClick={(a) => navigate(`/cartera/acuerdos/${a.id}`)}
            isLoading={isPending}
            emptyText="No hay acuerdos con estos filtros."
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
    </div>
  )
}
