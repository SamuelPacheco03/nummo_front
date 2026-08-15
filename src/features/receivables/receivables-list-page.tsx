import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { ChevronRight, Loader2, Percent, Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import { ContactPicker } from '@/components/contact-picker'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { DataTable, type Column } from '@/components/ui/data-table'
import { useContacts } from '@/features/contacts/hooks'
import { useBillingConcepts } from '@/features/masters/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canEditContacts, canManageAgreements } from '@/features/organizations/roles'
import { getErrorMessage } from '@/lib/errors'
import { formatAmount, formatDateHuman } from '@/lib/format'
import { cn } from '@/lib/utils'
import type {
  AccrueInterestResult,
  GenerateReceivablesResult,
  GetApiV1OrganizationsOrgIdReceivablesParams,
} from '@/api/generated/model'
import { RECEIVABLE_STATUS_LABELS, TONE_DOT, receivableStatusTone } from './labels'
import { CreateReceivableDialog } from './create-receivable-dialog'
import { useAccrueInterest, useGenerateReceivables, useReceivables } from './hooks'

type StatusFilter = '' | 'PENDING' | 'PARTIAL' | 'OVERDUE' | 'PAID' | 'CANCELLED' | 'WRITTEN_OFF'
const PAGE_SIZE = 20

export function StatusPill({ status }: { status: string }) {
  const tone = receivableStatusTone(status)
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm">
      <span className={cn('size-1.5 rounded-full', TONE_DOT[tone])} />
      {RECEIVABLE_STATUS_LABELS[status] ?? status}
    </span>
  )
}

export function ReceivablesListPage() {
  const { orgId, role } = useCurrentOrg()
  const canGenerate = canManageAgreements(role)
  const canCreate = canEditContacts(role)
  const navigate = useNavigate()

  const [status, setStatus] = useState<StatusFilter>('')
  const [payerId, setPayerId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    setPage(1)
  }, [status, payerId])

  const params: GetApiV1OrganizationsOrgIdReceivablesParams = {
    page,
    pageSize: PAGE_SIZE,
    displayStatus: status || undefined,
    payerContactId: payerId || undefined,
    order: 'asc',
  }
  const { items, total, totalPages, isPending, isError, error, isFetching } = useReceivables(orgId, params)

  const { contacts } = useContacts(orgId, { page: 1, pageSize: 100, sort: 'name', order: 'asc' })
  const { items: concepts } = useBillingConcepts(orgId, { page: 1, pageSize: 100, sort: 'name', order: 'asc' })
  const contactMap = useMemo(() => new Map(contacts.map((c) => [c.id, c.displayName])), [contacts])
  const conceptMap = useMemo(() => new Map(concepts.map((c) => [c.id, c.name])), [concepts])

  type Row = (typeof items)[number]
  const columns: Column<Row>[] = [
    { header: 'Pagador', cell: (r) => contactMap.get(r.payerContactId) ?? '—', className: 'font-medium' },
    { header: 'Concepto', cell: (r) => conceptMap.get(r.billingConceptId) ?? '—', className: 'text-muted-foreground' },
    { header: 'Vence', cell: (r) => formatDateHuman(r.dueDate), className: 'nums text-muted-foreground' },
    {
      header: 'Saldo',
      cell: (r) => formatAmount(r.balance, r.currency),
      className: 'nums text-right font-medium',
      headClassName: 'text-right',
    },
    { header: 'Estado', cell: (r) => <StatusPill status={r.displayStatus} /> },
    { header: '', cell: () => <ChevronRight className="size-4 text-muted-foreground" />, className: 'w-8', cardHidden: true },
  ]
  const renderCard = (r: Row) => (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate font-medium">{contactMap.get(r.payerContactId) ?? '—'}</span>
        <span className="nums shrink-0 font-medium">{formatAmount(r.balance, r.currency)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span>{conceptMap.get(r.billingConceptId) ?? '—'}</span>
        <span aria-hidden>·</span>
        <span className="nums">Vence {formatDateHuman(r.dueDate)}</span>
        <span aria-hidden>·</span>
        <StatusPill status={r.displayStatus} />
      </div>
    </div>
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
            {generate.isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Generar mensualidades
          </Button>
        )}
        {canGenerate && (
          <Button variant="outline" size="sm" onClick={onAccrue} disabled={accrue.isPending}>
            {accrue.isPending ? <Loader2 className="size-4 animate-spin" /> : <Percent className="size-4" />}
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

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="sm:w-64">
          <ContactPicker
            orgId={orgId ?? ''}
            value={payerId}
            onChange={setPayerId}
            allowClear
            placeholder="Filtrar por pagador…"
          />
        </div>
        <NativeSelect
          className="w-44 sm:ml-auto"
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
      </div>

      {isError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {getErrorMessage(error, 'No se pudieron cargar las cuentas por cobrar.')}
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={items}
            getKey={(r) => r.receivableId}
            onRowClick={(r) => navigate(`/cartera/cxc/${r.receivableId}`)}
            isLoading={isPending}
            skeletonRows={8}
            emptyText="No hay cuentas por cobrar con estos filtros."
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

      {orgId && <CreateReceivableDialog orgId={orgId} open={createOpen} onOpenChange={setCreateOpen} />}
    </div>
  )
}
