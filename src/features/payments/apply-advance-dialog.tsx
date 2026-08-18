import { useMemo } from 'react'
import {
  AdvanceAllocationDialog,
  type AdvanceCopy,
  type AdvanceTarget,
} from '@/components/advance-allocation-dialog'
import { useReceivables } from '@/features/receivables/hooks'
import { useApplyAllocations } from './hooks'

const COPY: AdvanceCopy = {
  empty: 'Este pagador no tiene cuentas abiertas.',
  nothingAssigned: 'Asigna al menos una cuenta',
  amountLabel: 'Asignar a la cuenta',
}

/** Sin contraparte no hay nada que repartir; una sola referencia, siempre la misma. */
const NONE: AdvanceTarget[] = []

/**
 * Repartir el anticipo de un pago entre las cuentas por cobrar del pagador.
 *
 * El reparto vive en `AdvanceAllocationDialog`, compartido con los anticipos a
 * proveedor (§94.0). Esto solo traduce: de dónde salen las cuentas del pagador y
 * cómo se llama cada una en el cuerpo del POST.
 */
export function ApplyAdvanceDialog({
  orgId,
  paymentId,
  payerId,
  available,
  open,
  onOpenChange,
}: {
  orgId: string
  paymentId: string
  payerId: string | null
  available: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const useTargets = (): AdvanceTarget[] => {
    const { items } = useReceivables(orgId, {
      page: 1,
      pageSize: 100,
      payerContactId: payerId || undefined,
      order: 'asc',
    })
    const targets = useMemo(
      () =>
        items.map((r) => ({
          id: r.receivableId,
          dueDate: r.dueDate,
          balance: r.balance,
          currency: r.currency,
          displayStatus: r.displayStatus,
        })),
      [items],
    )
    // Sin contraparte no hay a quién repartirle, y el listado sin filtro trae
    // las de todo el mundo.
    return payerId ? targets : NONE
  }

  const useApply = (idempotencyKey: string) => {
    const apply = useApplyAllocations(orgId, idempotencyKey)
    return {
      isPending: apply.isPending,
      apply: (allocations: { targetId: string; amount: string }[]) =>
        apply.mutateAsync({
          orgId,
          id: paymentId,
          data: {
            allocations: allocations.map((a) => ({ receivableId: a.targetId, amount: a.amount })),
          },
        }),
    }
  }

  return (
    <AdvanceAllocationDialog
      open={open}
      onOpenChange={onOpenChange}
      available={available}
      copy={COPY}
      useTargets={useTargets}
      useApply={useApply}
    />
  )
}
