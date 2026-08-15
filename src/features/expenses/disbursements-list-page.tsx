import { useEffect, useMemo, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router'
import { ChevronRight, Plus } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import { ContactPicker } from '@/components/contact-picker'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { DataTable, type Column } from '@/components/ui/data-table'
import { useContacts } from '@/features/contacts/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canEditContacts } from '@/features/organizations/roles'
import { getErrorMessage } from '@/lib/errors'
import { formatAmount, formatDateHuman } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { GetApiV1OrganizationsOrgIdDisbursementsParams } from '@/api/generated/model'
import { DISBURSEMENT_PURPOSE_LABELS, DISBURSEMENT_STATUS_LABELS } from './labels'
import { useDisbursements } from './hooks'

type StatusFilter = '' | 'POSTED' | 'REVERSED'
type PurposeFilter = '' | 'EXPENSE' | 'ADVANCE' | 'DIRECT_EXPENSE'
const PAGE_SIZE = 20

export function DisbursementsListPage() {
  const { orgId, role } = useCurrentOrg()
  const canRegister = canEditContacts(role)
  const navigate = useNavigate()

  const [supplierId, setSupplierId] = useState<string | null>(null)
  const [status, setStatus] = useState<StatusFilter>('')
  const [purpose, setPurpose] = useState<PurposeFilter>('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [supplierId, status, purpose])

  const params: GetApiV1OrganizationsOrgIdDisbursementsParams = {
    page,
    pageSize: PAGE_SIZE,
    supplierContactId: supplierId || undefined,
    status: status || undefined,
    purpose: purpose || undefined,
    order: 'desc',
  }
  const { items, total, totalPages, isPending, isError, error, isFetching } = useDisbursements(orgId, params)

  const { contacts } = useContacts(orgId, { page: 1, pageSize: 100, sort: 'name', order: 'asc' })
  const contactMap = useMemo(() => new Map(contacts.map((c) => [c.id, c.displayName])), [contacts])

  const supplierName = (id?: string | null) => (id ? (contactMap.get(id) ?? '—') : '—')
  const statusChip = (s: string) => (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm">
      <span className={cn('size-1.5 rounded-full', s === 'REVERSED' ? 'bg-muted-foreground/40' : 'bg-success')} />
      {DISBURSEMENT_STATUS_LABELS[s] ?? s}
    </span>
  )

  type Row = (typeof items)[number]
  const columns: Column<Row>[] = [
    { header: 'Fecha', cell: (d) => formatDateHuman(d.disbursedAt), className: 'nums text-muted-foreground' },
    { header: 'Proveedor', cell: (d) => supplierName(d.supplierContactId), className: 'font-medium' },
    { header: 'Propósito', cell: (d) => DISBURSEMENT_PURPOSE_LABELS[d.purpose] ?? d.purpose, className: 'text-muted-foreground' },
    {
      header: 'Monto',
      cell: (d) => (
        <span className={cn(d.status === 'REVERSED' && 'text-muted-foreground line-through')}>{formatAmount(d.amount)}</span>
      ),
      className: 'nums text-right font-medium',
      headClassName: 'text-right',
    },
    { header: 'Estado', cell: (d) => statusChip(d.status) },
    { header: '', cell: () => <ChevronRight className="size-4 text-muted-foreground" />, className: 'w-8', cardHidden: true },
  ]
  const renderCard = (d: Row) => (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate font-medium">{supplierName(d.supplierContactId)}</span>
        <span className={cn('nums shrink-0 font-medium', d.status === 'REVERSED' && 'text-muted-foreground line-through')}>
          {formatAmount(d.amount)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span className="nums">{formatDateHuman(d.disbursedAt)}</span>
        <span aria-hidden>·</span>
        <span>{DISBURSEMENT_PURPOSE_LABELS[d.purpose] ?? d.purpose}</span>
        <span aria-hidden>·</span>
        {statusChip(d.status)}
      </div>
    </div>
  )

  return (
    <div>
      <PageHeader title="Egresos" description="Pagos realizados a proveedores.">
        {canRegister && (
          <Button asChild size="sm">
            <Link to="/gastos/egresos/nuevo">
              <Plus className="size-4" />
              Registrar egreso
            </Link>
          </Button>
        )}
      </PageHeader>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="sm:w-64">
          <ContactPicker orgId={orgId ?? ''} value={supplierId} onChange={setSupplierId} allowClear placeholder="Filtrar por proveedor…" />
        </div>
        <div className="flex gap-2 sm:ml-auto">
          <NativeSelect className="w-40" value={purpose} onChange={(e) => setPurpose(e.target.value as PurposeFilter)} aria-label="Propósito">
            <option value="">Todos</option>
            <option value="EXPENSE">Pago de gasto</option>
            <option value="ADVANCE">Anticipo</option>
            <option value="DIRECT_EXPENSE">Egreso directo</option>
          </NativeSelect>
          <NativeSelect className="w-36" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} aria-label="Estado">
            <option value="">Todos</option>
            <option value="POSTED">Registrado</option>
            <option value="REVERSED">Reversado</option>
          </NativeSelect>
        </div>
      </div>

      {isError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {getErrorMessage(error, 'No se pudieron cargar los egresos.')}
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={items}
            getKey={(d) => d.id}
            onRowClick={(d) => navigate(`/gastos/egresos/${d.id}`)}
            isLoading={isPending}
            skeletonRows={8}
            emptyText="No hay egresos con estos filtros."
            renderCard={renderCard}
          />

          {!isPending && total > 0 && (
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} totalPages={totalPages} isFetching={isFetching} onPage={setPage} />
          )}
        </>
      )}

      {/* Detalle en cajón: ruta hija, la lista se queda montada detrás. */}
      <Outlet />
    </div>
  )
}
