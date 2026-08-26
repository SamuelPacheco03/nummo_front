import { useMemo } from 'react'
import { useParams } from 'react-router'
import { Coins } from 'lucide-react'
import {
  AccountDetail,
  type AccountDetailCopy,
  type AccountDetailQuery,
} from '@/components/account-detail'
import { useExpenseCategories } from '@/features/masters/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { useCan } from '@/features/platform/permissions'
import { withApply } from '@/lib/settlement'
import { expenseStatus } from './labels'
import { useCancelExpense, useExpense, useWriteOffExpense } from './hooks'

const LIST = '/gastos/cxp'

const COPY: AccountDetailCopy = {
  entity: 'Cuenta por pagar',
  notFound: 'No se encontró el gasto.',
  fallbackTitle: 'Gasto',
  settleLabel: 'Registrar egreso',
  issueLabel: 'Emitido',
  cancelItem: 'Cancelar gasto',
  cancelTitle: 'Cancelar gasto',
  cancelDescription: 'El gasto dejará de estar activo. No se puede deshacer.',
  canceled: 'Gasto cancelado',
  writeOffTitle: 'Castigar gasto',
  writeOffDescription: 'Se marca como no pagadero (write-off). No se puede deshacer.',
  writtenOff: 'Gasto castigado',
}

/**
 * Ficha de una cuenta por pagar. Abre como cajón sobre la lista.
 *
 * La ficha vive en `AccountDetail`, compartida con cuentas por cobrar (§94.0).
 * Esto solo traduce: de dónde sale el gasto, su categoría y cómo se cierra. Sin
 * mora ni ajustes — eso es de la otra cara.
 */
export function ExpenseDetailPage() {
  const { expenseId } = useParams()
  const { orgId } = useCurrentOrg()
  const can = useCan()

  const { detail, isPending, isError, error } = useExpense(orgId, expenseId)
  const e = detail?.expense
  const b = detail?.balance
  const { items: categories } = useExpenseCategories(orgId, {
    page: 1,
    pageSize: 100,
    sort: 'position',
    order: 'asc',
  })
  const catalogName = useMemo(
    () => categories.find((c) => c.id === e?.expenseCategoryId)?.name,
    [categories, e],
  )

  const query: AccountDetailQuery = {
    data:
      detail && e
        ? {
            id: e.id,
            contactId: e.supplierContactId,
            catalogName,
            status: b?.displayStatus ?? e.state,
            currency: e.currency,
            originalAmount: b?.originalAmount ?? e.originalAmount,
            paidTotal: b?.paidTotal,
            balance: b?.balance ?? e.originalAmount,
            dueDate: e.dueDate,
            issueDate: e.issueDate,
            notes: e.notes,
            cancellationReason: e.cancellationReason,
          }
        : undefined,
    isPending,
    isError,
    error,
  }

  const cancel = useCancelExpense(orgId ?? '')
  const writeOff = useWriteOffExpense(orgId ?? '')
  const args = { orgId: orgId ?? '', id: expenseId ?? '', data: {} }
  const close = {
    cancel: { isPending: cancel.isPending, run: () => cancel.mutateAsync(args) },
    writeOff: { isPending: writeOff.isPending, run: () => writeOff.mutateAsync(args) },
  }

  return (
    <AccountDetail
      listTo={LIST}
      copy={COPY}
      statusOf={expenseStatus}
      settleTo={(contactId, id) => withApply(`/gastos/egresos/nuevo?supplier=${contactId}`, id)}
      settleIcon={Coins}
      canSettle={can('disbursements.create')}
      canManage={can('expenses.manage')}
      query={query}
      close={close}
    />
  )
}
