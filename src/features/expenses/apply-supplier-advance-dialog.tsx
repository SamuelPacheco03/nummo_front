import { useMemo } from 'react'
import {
  AdvanceAllocationDialog,
  type AdvanceCopy,
  type AdvanceTarget,
} from '@/components/advance-allocation-dialog'
import { useApplyDisbursementAllocations, useExpenses } from './hooks'

const COPY: AdvanceCopy = {
  empty: 'Este proveedor no tiene gastos abiertos.',
  nothingAssigned: 'Asigna al menos un gasto',
  amountLabel: 'Asignar al gasto',
}

/** Sin contraparte no hay nada que repartir; una sola referencia, siempre la misma. */
const NONE: AdvanceTarget[] = []

/**
 * Repartir el anticipo de un egreso entre los gastos abiertos del proveedor.
 *
 * Es el espejo de `ApplyAdvanceDialog`: el reparto es el mismo y vive en
 * `AdvanceAllocationDialog` (§94.0). Esto solo traduce de dónde salen los gastos
 * y cómo se llama cada uno en el cuerpo del POST.
 */
export function ApplySupplierAdvanceDialog({
  orgId,
  disbursementId,
  supplierId,
  available,
  open,
  onOpenChange,
}: {
  orgId: string
  disbursementId: string
  supplierId: string | null
  available: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const useTargets = (): AdvanceTarget[] => {
    const { items } = useExpenses(orgId, {
      page: 1,
      pageSize: 100,
      supplierContactId: supplierId || undefined,
      order: 'asc',
    })
    const targets = useMemo(
      () =>
        items.map((e) => ({
          id: e.expenseId,
          dueDate: e.dueDate,
          balance: e.balance,
          currency: e.currency,
          displayStatus: e.displayStatus,
        })),
      [items],
    )
    // Sin contraparte no hay a quién repartirle, y el listado sin filtro trae
    // las de todo el mundo.
    return supplierId ? targets : NONE
  }

  const useApply = (idempotencyKey: string) => {
    const apply = useApplyDisbursementAllocations(orgId, idempotencyKey)
    return {
      isPending: apply.isPending,
      apply: (allocations: { targetId: string; amount: string }[]) =>
        apply.mutateAsync({
          orgId,
          id: disbursementId,
          data: {
            allocations: allocations.map((a) => ({ expenseId: a.targetId, amount: a.amount })),
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
