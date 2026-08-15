import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ChevronRight, Plus } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import { SearchInput } from '@/components/search-input'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { DataTable, type Column } from '@/components/ui/data-table'
import { useContacts } from '@/features/contacts/hooks'
import { useBillingConcepts } from '@/features/masters/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canManageAgreements } from '@/features/organizations/roles'
import { getErrorMessage } from '@/lib/errors'
import { formatAmount } from '@/lib/format'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { cn } from '@/lib/utils'
import type { GetApiV1OrganizationsOrgIdBillingAgreementsParams } from '@/api/generated/model'
import { AGREEMENT_STATUS_LABELS, RECURRENCE_LABELS, agreementStatusTone } from './labels'
import { useAgreements } from './hooks'

type StatusFilter = '' | 'ACTIVE' | 'PAUSED' | 'ENDED' | 'CANCELLED'
const PAGE_SIZE = 20
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
  const [status, setStatus] = useState<StatusFilter>('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [q, status])

  const params: GetApiV1OrganizationsOrgIdBillingAgreementsParams = {
    page,
    pageSize: PAGE_SIZE,
    q: q || undefined,
    status: status || undefined,
    sort: 'createdAt',
    order: 'desc',
  }
  const { items, total, totalPages, isPending, isError, error, isFetching } = useAgreements(orgId, params)

  // El API devuelve ids; resolvemos nombres con mapas (suficiente para el catálogo
  // de una org; a gran escala el backend debería denormalizar en el listado).
  const { contacts } = useContacts(orgId, { page: 1, pageSize: 100, sort: 'name', order: 'asc' })
  const { items: concepts } = useBillingConcepts(orgId, { page: 1, pageSize: 100, sort: 'name', order: 'asc' })
  const contactMap = useMemo(() => new Map(contacts.map((c) => [c.id, c.displayName])), [contacts])
  const conceptMap = useMemo(() => new Map(concepts.map((c) => [c.id, c.name])), [concepts])

  type Row = (typeof items)[number]
  const columns: Column<Row>[] = [
    {
      header: 'Pagador',
      cell: (a) => (
        <>
          {contactMap.get(a.payerContactId) ?? '—'}
          {a.name && <span className="block text-xs font-normal text-muted-foreground">{a.name}</span>}
        </>
      ),
      className: 'font-medium',
    },
    { header: 'Concepto', cell: (a) => conceptMap.get(a.billingConceptId) ?? '—', className: 'text-muted-foreground' },
    {
      header: 'Monto',
      cell: (a) => formatAmount(a.agreedAmount, a.currency),
      className: 'nums text-right',
      headClassName: 'text-right',
    },
    {
      header: 'Recurrencia',
      cell: (a) => `${RECURRENCE_LABELS[a.recurrenceType] ?? a.recurrenceType} · día ${a.dueDay}`,
      className: 'text-muted-foreground',
    },
    { header: 'Estado', cell: (a) => <StatusPill status={a.status} /> },
    { header: '', cell: () => <ChevronRight className="size-4 text-muted-foreground" />, className: 'w-8', cardHidden: true },
  ]
  const renderCard = (a: Row) => (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate font-medium">{contactMap.get(a.payerContactId) ?? '—'}</span>
        <span className="nums shrink-0 font-medium">{formatAmount(a.agreedAmount, a.currency)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span>{conceptMap.get(a.billingConceptId) ?? '—'}</span>
        <span aria-hidden>·</span>
        <span>día {a.dueDay}</span>
        <span aria-hidden>·</span>
        <StatusPill status={a.status} />
      </div>
    </div>
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

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar acuerdo…" className="sm:max-w-xs" />
        <NativeSelect
          className="w-40 sm:ml-auto"
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
      </div>

      {isError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {getErrorMessage(error, 'No se pudieron cargar los acuerdos.')}
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={items}
            getKey={(a) => a.id}
            onRowClick={(a) => navigate(`/cartera/acuerdos/${a.id}`)}
            isLoading={isPending}
            skeletonRows={8}
            emptyText="No hay acuerdos con estos filtros."
            renderCard={renderCard}
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
