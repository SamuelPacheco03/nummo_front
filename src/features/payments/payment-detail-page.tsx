import { useParams } from 'react-router'
import {
  SettlementDetail,
  type SettlementDetailCopy,
  type SettlementDetailQuery,
} from '@/components/settlement-detail'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { useCan } from '@/features/platform/permissions'
import { PAYMENT_PURPOSE_LABELS, paymentStatus } from './labels'
import { ApplyAdvanceDialog } from './apply-advance-dialog'
import { usePayment, useReversePayment } from './hooks'

const LIST = '/cartera/pagos'

const COPY: SettlementDetailCopy = {
  entity: 'Pago',
  notFound: 'No se encontró el pago.',
  direct: 'Ingreso directo',
  dateLabel: 'Recibido',
  allocationsTitle: 'Aplicado a cuentas',
  allocationLink: 'Ver cuenta',
  reverseTitle: 'Revertir pago',
  reverseDescription:
    'Se genera un movimiento de reversión y el saldo de la cartera se recalcula. No borra historia.',
  reversed: 'Pago reversado',
}

/**
 * Ficha de un pago. Abre como cajón sobre la lista (ruta hija de /cartera/pagos).
 *
 * La ficha vive en `SettlementDetail`, compartida con la de egresos (§94.0).
 * Esto solo traduce: de dónde sale el pago, cómo se reversa y a dónde llevan sus
 * aplicaciones.
 */
export function PaymentDetailPage() {
  const { paymentId } = useParams()
  const { orgId } = useCurrentOrg()
  const can = useCan()

  const { detail, isPending, isError, error } = usePayment(orgId, paymentId)
  const p = detail?.payment

  const query: SettlementDetailQuery = {
    data:
      detail && p
        ? {
            id: p.id,
            contactId: p.payerContactId,
            purposeLabel: PAYMENT_PURPOSE_LABELS[p.purpose] ?? p.purpose,
            status: p.status,
            amount: p.amount,
            date: p.receivedAt,
            paymentMethodId: p.paymentMethodId,
            reference: p.reference,
            notes: p.notes,
            unallocatedAmount: detail.unallocated.unallocatedAmount,
            allocations: detail.allocations.map((a) => ({
              id: a.id,
              targetId: a.receivableId,
              allocatedAt: a.allocatedAt,
              amount: a.amount,
            })),
          }
        : undefined,
    isPending,
    isError,
    error,
  }

  const useReverse = (idempotencyKey: string) => {
    const reverse = useReversePayment(orgId ?? '', idempotencyKey)
    return {
      isPending: reverse.isPending,
      reverse: () => reverse.mutateAsync({ orgId: orgId ?? '', id: paymentId ?? '' }),
    }
  }

  return (
    <SettlementDetail
      listTo={LIST}
      targetTo={(receivableId) => `/cartera/cxc/${receivableId}`}
      copy={COPY}
      statusOf={paymentStatus}
      canReverse={can('payments.reverse')}
      canApply={can('payments.allocate')}
      query={query}
      useReverse={useReverse}
      applyDialog={(open, onOpenChange, payment) =>
        orgId && (
          <ApplyAdvanceDialog
            orgId={orgId}
            paymentId={payment.id}
            payerId={payment.contactId}
            available={payment.unallocatedAmount}
            open={open}
            onOpenChange={onOpenChange}
          />
        )
      }
    />
  )
}
