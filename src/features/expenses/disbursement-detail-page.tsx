import { useParams } from 'react-router'
import {
  SettlementDetail,
  type SettlementDetailCopy,
  type SettlementDetailQuery,
} from '@/components/settlement-detail'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { DISBURSEMENT_PURPOSE_LABELS, disbursementStatus } from './labels'
import { ApplySupplierAdvanceDialog } from './apply-supplier-advance-dialog'
import { useDisbursement, useReverseDisbursement } from './hooks'

const LIST = '/gastos/egresos'

const COPY: SettlementDetailCopy = {
  entity: 'Egreso',
  notFound: 'No se encontró el egreso.',
  direct: 'Egreso directo',
  dateLabel: 'Fecha',
  allocationsTitle: 'Aplicado a gastos',
  allocationLink: 'Ver gasto',
  reverseTitle: 'Revertir egreso',
  reverseDescription:
    'Se genera un movimiento de reversión y el saldo se recalcula. No borra historia.',
  reversed: 'Egreso reversado',
}

/**
 * Ficha de un egreso. Abre como cajón sobre la lista (ruta hija de /gastos/egresos).
 *
 * Es el espejo de la ficha de pagos: la pantalla es la misma y vive en
 * `SettlementDetail` (§94.0). Esto solo traduce de dónde sale el egreso, cómo se
 * reversa y a dónde llevan sus aplicaciones.
 */
export function DisbursementDetailPage() {
  const { disbursementId } = useParams()
  const { orgId } = useCurrentOrg()

  const { detail, isPending, isError, error } = useDisbursement(orgId, disbursementId)
  const d = detail?.disbursement

  const query: SettlementDetailQuery = {
    data:
      detail && d
        ? {
            id: d.id,
            contactId: d.supplierContactId,
            purposeLabel: DISBURSEMENT_PURPOSE_LABELS[d.purpose] ?? d.purpose,
            status: d.status,
            amount: d.amount,
            date: d.disbursedAt,
            paymentMethodId: d.paymentMethodId,
            reference: d.reference,
            notes: d.notes,
            unallocatedAmount: detail.unallocated.unallocatedAmount,
            allocations: detail.allocations.map((a) => ({
              id: a.id,
              targetId: a.expenseId,
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
    const reverse = useReverseDisbursement(orgId ?? '', idempotencyKey)
    return {
      isPending: reverse.isPending,
      reverse: () => reverse.mutateAsync({ orgId: orgId ?? '', id: disbursementId ?? '' }),
    }
  }

  return (
    <SettlementDetail
      listTo={LIST}
      targetTo={(expenseId) => `/gastos/cxp/${expenseId}`}
      copy={COPY}
      statusOf={disbursementStatus}
      query={query}
      useReverse={useReverse}
      applyDialog={(open, onOpenChange, disbursement) =>
        orgId && (
          <ApplySupplierAdvanceDialog
            orgId={orgId}
            disbursementId={disbursement.id}
            supplierId={disbursement.contactId}
            available={disbursement.unallocatedAmount}
            open={open}
            onOpenChange={onOpenChange}
          />
        )
      }
    />
  )
}
