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
import { PAYMENT_PURPOSE_LABELS, PAYMENT_STATUS_LABELS } from './labels'
import { ApplyAdvanceDialog } from './apply-advance-dialog'
import { usePayment, useReversePayment } from './hooks'

function Row({ label, children }: { label: string; children: ReactNode }) {
  if (children == null || children === '') return null
  return (
    <div className="flex items-center justify-between px-4 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="nums text-right">{children}</span>
    </div>
  )
}

export function PaymentDetailPage() {
  const { paymentId } = useParams()
  const { orgId, role } = useCurrentOrg()
  const canReverse = canManageAgreements(role)
  const canApply = canEditContacts(role)

  const { detail, isPending, isError, error } = usePayment(orgId, paymentId)
  const reverse = useReversePayment(orgId ?? '')
  const [reverseOpen, setReverseOpen] = useState(false)
  const [applyOpen, setApplyOpen] = useState(false)

  const p = detail?.payment
  const { contact: payer } = useContact(orgId, p?.payerContactId ?? undefined)
  const { items: methods } = usePaymentMethods(orgId, { page: 1, pageSize: 100, sort: 'name', order: 'asc' })
  const methodName = useMemo(() => methods.find((m) => m.id === p?.paymentMethodId)?.name, [methods, p])

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }
  if (isError || !detail || !p) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/cartera/pagos">
            <ArrowLeft className="size-4" />
            Pagos
          </Link>
        </Button>
        <p className="text-sm text-destructive">{getErrorMessage(error, 'No se encontró el pago.')}</p>
      </div>
    )
  }

  const reversed = p.status === 'REVERSED'
  const unassigned = Number(detail.unallocated.unallocatedAmount) || 0

  const onReverse = async () => {
    try {
      await reverse.mutateAsync({ orgId: orgId ?? '', id: p.id })
      toast.success('Pago reversado')
      setReverseOpen(false)
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo reversar'))
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link to="/cartera/pagos">
            <ArrowLeft className="size-4" />
            Pagos
          </Link>
        </Button>
        <PageHeader
          title={payer?.displayName ?? 'Ingreso directo'}
          description={
            <span className="inline-flex items-center gap-1.5">
              <span className={cn('size-1.5 rounded-full', reversed ? 'bg-muted-foreground/40' : 'bg-success')} />
              {PAYMENT_STATUS_LABELS[p.status] ?? p.status} · {PAYMENT_PURPOSE_LABELS[p.purpose] ?? p.purpose}
            </span>
          }
        >
          {canApply && !reversed && unassigned > 0 && p.payerContactId && (
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
          Crédito sin asignar:{' '}
          <span className="nums font-semibold">{formatAmount(detail.unallocated.unallocatedAmount)}</span>
        </div>
      )}

      <section>
        <h2 className="mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">Resumen</h2>
        <Card className="gap-0 py-0">
          <div className="divide-y">
            <Row label="Monto">
              <span className={cn('font-semibold', reversed && 'line-through')}>{formatAmount(p.amount)}</span>
            </Row>
            <Row label="Recibido">{formatDateHuman(p.receivedAt)}</Row>
            <Row label="Método">{methodName ?? '—'}</Row>
            <Row label="Referencia">{p.reference}</Row>
            <Row label="Notas">{p.notes}</Row>
          </div>
        </Card>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Aplicado a cuentas ({detail.allocations.length})
        </h2>
        <Card className="gap-0 py-0">
          {detail.allocations.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Sin asignaciones.</p>
          ) : (
            <ul className="divide-y">
              {detail.allocations.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <Link to={`/cartera/cxc/${a.receivableId}`} className="text-brand hover:underline">
                    Ver cuenta
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
        <ApplyAdvanceDialog
          orgId={orgId}
          paymentId={p.id}
          payerId={p.payerContactId}
          available={detail.unallocated.unallocatedAmount}
          open={applyOpen}
          onOpenChange={setApplyOpen}
        />
      )}
      <ConfirmDialog
        open={reverseOpen}
        onOpenChange={setReverseOpen}
        title="Revertir pago"
        description="Se genera un movimiento de reversión y el saldo de la cartera se recalcula. No borra historia."
        confirmLabel="Revertir"
        destructive
        loading={reverse.isPending}
        onConfirm={onReverse}
      />
    </div>
  )
}
