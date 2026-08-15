import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, Undo2, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useContact } from '@/features/contacts/hooks'
import { usePaymentMethods } from '@/features/masters/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canEditContacts, canManageAgreements } from '@/features/organizations/roles'
import { getErrorMessage } from '@/lib/errors'
import { formatAmount, formatDateHuman } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'
import { DISBURSEMENT_PURPOSE_LABELS, DISBURSEMENT_STATUS_LABELS } from './labels'
import { ApplySupplierAdvanceDialog } from './apply-supplier-advance-dialog'
import { useDisbursement, useReverseDisbursement } from './hooks'

function Row({ label, children }: { label: string; children: ReactNode }) {
  if (children == null || children === '') return null
  return (
    <div className="flex items-center justify-between px-4 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="nums text-right">{children}</span>
    </div>
  )
}

export function DisbursementDetailPage() {
  const { disbursementId } = useParams()
  const { orgId, role } = useCurrentOrg()
  const canReverse = canManageAgreements(role)
  const canApply = canEditContacts(role)

  const { detail, isPending, isError, error } = useDisbursement(orgId, disbursementId)
  const reverse = useReverseDisbursement(orgId ?? '')
  const [reverseOpen, setReverseOpen] = useState(false)
  const [applyOpen, setApplyOpen] = useState(false)

  const d = detail?.disbursement
  const { contact: supplier } = useContact(orgId, d?.supplierContactId ?? undefined)
  const { items: methods } = usePaymentMethods(orgId, { page: 1, pageSize: 100, sort: 'name', order: 'asc' })
  const methodName = useMemo(() => methods.find((m) => m.id === d?.paymentMethodId)?.name, [methods, d])

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }
  if (isError || !detail || !d) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/gastos/egresos">
            <ArrowLeft className="size-4" />
            Egresos
          </Link>
        </Button>
        <p className="text-sm text-destructive">{getErrorMessage(error, 'No se encontró el egreso.')}</p>
      </div>
    )
  }

  const reversed = d.status === 'REVERSED'
  const unassigned = Number(detail.unallocated.unallocatedAmount) || 0

  const onReverse = async () => {
    try {
      await reverse.mutateAsync({ orgId: orgId ?? '', id: d.id })
      toast.success('Egreso reversado')
      setReverseOpen(false)
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo reversar'))
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link to="/gastos/egresos">
            <ArrowLeft className="size-4" />
            Egresos
          </Link>
        </Button>
        <PageHeader
          title={supplier?.displayName ?? 'Egreso directo'}
          description={
            <span className="inline-flex items-center gap-1.5">
              <span className={cn('size-1.5 rounded-full', reversed ? 'bg-muted-foreground/40' : 'bg-success')} />
              {DISBURSEMENT_STATUS_LABELS[d.status] ?? d.status} · {DISBURSEMENT_PURPOSE_LABELS[d.purpose] ?? d.purpose}
            </span>
          }
        >
          {canApply && !reversed && unassigned > 0 && d.supplierContactId && (
            <Button variant="outline" size="sm" onClick={() => setApplyOpen(true)}>
              <Wallet className="size-4" />
              Aplicar anticipo
            </Button>
          )}
          {canReverse && !reversed && (
            <Button variant="outline" size="sm" onClick={() => setReverseOpen(true)}>
              <Undo2 className="size-4" />
              Revertir
            </Button>
          )}
        </PageHeader>
      </div>

      {unassigned > 0 && !reversed && (
        <div className="rounded-lg border border-warning/40 bg-warning/5 px-4 py-3 text-sm">
          Crédito sin asignar: <span className="nums font-semibold">{formatAmount(detail.unallocated.unallocatedAmount)}</span>
        </div>
      )}

      <section>
        <h2 className="mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">Resumen</h2>
        <Card className="gap-0 py-0">
          <div className="divide-y">
            <Row label="Monto">
              <span className={cn('font-semibold', reversed && 'line-through')}>{formatAmount(d.amount)}</span>
            </Row>
            <Row label="Fecha">{formatDateHuman(d.disbursedAt)}</Row>
            <Row label="Método">{methodName ?? '—'}</Row>
            <Row label="Referencia">{d.reference}</Row>
            <Row label="Notas">{d.notes}</Row>
          </div>
        </Card>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Aplicado a gastos ({detail.allocations.length})
        </h2>
        <Card className="gap-0 py-0">
          {detail.allocations.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Sin asignaciones.</p>
          ) : (
            <ul className="divide-y">
              {detail.allocations.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <Link to={`/gastos/cxp/${a.expenseId}`} className="text-brand hover:underline">
                    Ver gasto
                  </Link>
                  <span className="nums text-xs text-muted-foreground">{formatDateHuman(a.allocatedAt)}</span>
                  <span className="nums ml-auto font-medium">{formatAmount(a.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {orgId && (
        <ApplySupplierAdvanceDialog
          orgId={orgId}
          disbursementId={d.id}
          supplierId={d.supplierContactId}
          available={detail.unallocated.unallocatedAmount}
          open={applyOpen}
          onOpenChange={setApplyOpen}
        />
      )}
      <ConfirmDialog
        open={reverseOpen}
        onOpenChange={setReverseOpen}
        title="Revertir egreso"
        description="Se genera un movimiento de reversión y el saldo se recalcula. No borra historia."
        confirmLabel="Revertir"
        destructive
        loading={reverse.isPending}
        onConfirm={onReverse}
      />
    </div>
  )
}
