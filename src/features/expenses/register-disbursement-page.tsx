import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { SettlementDrawer } from '@/components/settlement-drawer'
import {
  applyId,
  isOpenAccount,
  returnPath,
  type SettlementCopy,
  type SettlementValues,
} from '@/lib/settlement'
import { useExpenseCategories } from '@/features/masters/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { toastApiError } from '@/features/platform/errors'
import type {
  DisbursementDetail,
  RegisterDisbursementAllocationsItem,
} from '@/api/generated/model'
import { DISBURSEMENT_PURPOSE_LABELS, expenseStatus } from './labels'
import { useExpenses, useRegisterDisbursement } from './hooks'

const LIST = '/gastos/egresos'

const PURPOSES = ['EXPENSE', 'ADVANCE', 'DIRECT_EXPENSE'].map((value) => ({
  value,
  label: DISBURSEMENT_PURPOSE_LABELS[value] ?? value,
}))

const COPY: SettlementCopy = {
  action: 'Registrar egreso',
  party: 'Proveedor',
  partyMissing: 'Selecciona el proveedor',
  account: 'Cuenta origen',
  directConcept: 'Categoría del egreso',
  directConceptMissing: 'Selecciona la categoría del egreso',
  allocate: '¿Qué gastos cubre?',
  open: ['gasto abierto', 'gastos abiertos'],
  unit: ['gasto', 'gastos'],
  selectAll: 'Seleccionar todos',
  clearAll: 'Quitar todos',
  nothingOpen: 'Este proveedor no tiene gastos abiertos. El egreso queda como anticipo.',
  leftover: 'como anticipo al proveedor',
}

/**
 * Dinero que sale. Es el espejo de registrar un pago, así que comparte el
 * formulario (`SettlementDrawer`) y solo aporta lo suyo: las palabras, los
 * gastos abiertos del proveedor y la llamada al contrato.
 */
export function RegisterDisbursementPage() {
  const navigate = useNavigate()
  const { orgId } = useCurrentOrg()
  const oid = orgId ?? ''
  const [searchParams] = useSearchParams()
  const [idempotencyKey] = useState(() => crypto.randomUUID())
  const register = useRegisterDisbursement(oid, idempotencyKey)

  // Se siembra desde el gasto del que se venía: llegar aquí con el proveedor ya
  // puesto es la mitad del formulario resuelta.
  const [supplierId, setSupplierId] = useState<string | null>(searchParams.get('supplier'))
  // Quien llegó desde una cuenta por pagar vuelve a ella, no a la ficha del
  // egreso: lo que estaba mirando era la cartera.
  const back = returnPath(searchParams)
  // Y el gasto que estaba mirando llega marcado: venía a pagar ese.
  const preselected = applyId(searchParams)

  const { items: categories } = useExpenseCategories(orgId, {
    page: 1,
    pageSize: 100,
    isActive: 'true',
    sort: 'position',
    order: 'asc',
  })
  const { items: expenses } = useExpenses(oid, {
    page: 1,
    pageSize: 100,
    supplierContactId: supplierId || undefined,
    order: 'asc',
  })
  const openAccounts = useMemo(
    () =>
      supplierId
        ? expenses.filter(isOpenAccount).map((e) => ({
            id: e.expenseId,
            dueDate: e.dueDate,
            balance: e.balance,
            currency: e.currency,
            catalogId: e.expenseCategoryId,
            status: e.displayStatus,
          }))
        : [],
    [supplierId, expenses],
  )

  const onSubmit = async (v: SettlementValues) => {
    const allocations: RegisterDisbursementAllocationsItem[] = v.allocations.map((a) => ({
      expenseId: a.id,
      amount: a.amount,
    }))
    try {
      const res = await register.mutateAsync({
        orgId: oid,
        data: {
          paymentMethodId: v.paymentMethodId,
          financialAccountId: v.financialAccountId,
          supplierContactId: supplierId ?? undefined,
          purpose: v.purpose as 'EXPENSE' | 'ADVANCE' | 'DIRECT_EXPENSE',
          directExpenseCategoryId: v.directConceptId,
          disbursedAt: new Date(v.date).toISOString(),
          amount: v.amount,
          reference: v.reference,
          allocations: allocations.length ? allocations : undefined,
        },
      })
      const detail = res.data as DisbursementDetail
      toast.success('Egreso registrado')
      navigate(back ?? `${LIST}/${detail.disbursement.id}`)
    } catch (err) {
      toastApiError(err, 'No se pudo registrar el egreso')
    }
  }

  return (
    <SettlementDrawer
      closeTo={back ?? LIST}
      copy={COPY}
      purposes={PURPOSES}
      applyPurpose="EXPENSE"
      directPurpose="DIRECT_EXPENSE"
      directConcepts={categories}
      partyId={supplierId}
      onPartyChange={setSupplierId}
      openAccounts={openAccounts}
      preselectedAccountId={preselected}
      statusOf={expenseStatus}
      amountInfo="Se suma solo con los gastos que marques arriba. Puedes escribir otro: lo que sobre queda como anticipo al proveedor."
      isSubmitting={register.isPending}
      onSubmit={onSubmit}
    />
  )
}
