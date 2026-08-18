import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Undo2, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  DetailDrawer,
  DetailEmpty,
  DetailRow,
  DetailRows,
  DetailSection,
} from '@/components/ui/detail-drawer'
import { StatusBadge } from '@/components/ui/status-badge'
import { useContact } from '@/features/contacts/hooks'
import { usePaymentMethods } from '@/features/masters/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canEditContacts, canManageAgreements } from '@/features/organizations/roles'
import { getErrorMessage } from '@/lib/errors'
import { useIdempotencyKey } from '@/lib/idempotency'
import { formatAmount, formatDateHuman } from '@/lib/format'
import { cn } from '@/lib/utils'
import { PAYMENT_PURPOSE_LABELS, paymentStatus } from './labels'
import { ApplyAdvanceDialog } from './apply-advance-dialog'
import { usePayment, useReversePayment } from './hooks'

const LIST = '/cartera/pagos'

/** Ficha de un pago. Abre como cajón sobre la lista (ruta hija de /cartera/pagos). */
export function PaymentDetailPage() {
  const { paymentId } = useParams()
  const { orgId, role } = useCurrentOrg()
  const canReverse = canManageAgreements(role)
  const canApply = canEditContacts(role)

  const { detail, isPending, isError, error } = usePayment(orgId, paymentId)
  const idem = useIdempotencyKey()
  const reverse = useReversePayment(orgId ?? '', idem.key)
  const [reverseOpen, setReverseOpen] = useState(false)
  const [applyOpen, setApplyOpen] = useState(false)

  const p = detail?.payment
  const { contact: payer } = useContact(orgId, p?.payerContactId ?? undefined)
  const { items: methods } = usePaymentMethods(orgId, {
    page: 1,
    pageSize: 100,
    sort: 'name',
    order: 'asc',
  })
  const methodName = useMemo(() => methods.find((m) => m.id === p?.paymentMethodId)?.name, [methods, p])

  if (isPending) return <DetailDrawer closeTo={LIST} loading />
  if (isError || !detail || !p) {
    return (
      <DetailDrawer
        closeTo={LIST}
        title="Pago"
        error={getErrorMessage(error, 'No se encontró el pago.')}
      />
    )
  }

  const reversed = p.status === 'REVERSED'
  const unassigned = Number(detail.unallocated.unallocatedAmount) || 0

  const onReverse = async () => {
    try {
      await reverse.mutateAsync({ orgId: orgId ?? '', id: p.id })
      toast.success('Pago reversado')
      idem.renew()
      setReverseOpen(false)
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo reversar'))
    }
  }

  return (
    <>
      <DetailDrawer
        closeTo={LIST}
        title={payer?.displayName ?? 'Ingreso directo'}
        meta={
          <span className="flex items-center gap-2">
            {PAYMENT_PURPOSE_LABELS[p.purpose] ?? p.purpose}
            <span className="text-border">·</span>
            <StatusBadge {...paymentStatus(p.status)} />
          </span>
        }
        amount={
          <span className={cn(reversed && 'text-muted-foreground line-through')}>
            {formatAmount(p.amount)}
          </span>
        }
        actions={
          <>
            {canApply && !reversed && unassigned > 0 && p.payerContactId && (
              <Button size="sm" onClick={() => setApplyOpen(true)}>
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
          </>
        }
      >
        {unassigned > 0 && !reversed && (
          <div className="border-warning/40 bg-warning/5 rounded-lg border px-3.5 py-2.5 text-sm">
            Crédito sin asignar:{' '}
            <span className="nums font-semibold">
              {formatAmount(detail.unallocated.unallocatedAmount)}
            </span>
          </div>
        )}

        <DetailSection title="Resumen">
          <DetailRows>
            <DetailRow label="Recibido">{formatDateHuman(p.receivedAt)}</DetailRow>
            <DetailRow label="Método">{methodName ?? '—'}</DetailRow>
            <DetailRow label="Referencia">{p.reference}</DetailRow>
            <DetailRow label="Notas">{p.notes}</DetailRow>
          </DetailRows>
        </DetailSection>

        <DetailSection title={`Aplicado a cuentas (${detail.allocations.length})`}>
          {detail.allocations.length === 0 ? (
            <DetailEmpty>Sin asignaciones.</DetailEmpty>
          ) : (
            <DetailRows>
              {detail.allocations.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-3.5 py-2.5 text-sm">
                  <Link to={`/cartera/cxc/${a.receivableId}`} className="text-brand hover:underline">
                    Ver cuenta
                  </Link>
                  <span className="nums text-muted-foreground text-xs">
                    {formatDateHuman(a.allocatedAt)}
                  </span>
                  <span className="nums ml-auto font-medium">{formatAmount(a.amount)}</span>
                </div>
              ))}
            </DetailRows>
          )}
        </DetailSection>
      </DetailDrawer>

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
    </>
  )
}
