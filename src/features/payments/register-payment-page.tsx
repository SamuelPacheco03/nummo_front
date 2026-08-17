import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { SettlementDrawer } from '@/components/settlement-drawer'
import {
  isOpenAccount,
  returnPath,
  type SettlementCopy,
  type SettlementValues,
} from '@/lib/settlement'
import { useBillingConcepts } from '@/features/masters/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { useReceivables } from '@/features/receivables/hooks'
import { getErrorMessage } from '@/lib/errors'
import type { PaymentDetail, RegisterPaymentAllocationsItem } from '@/api/generated/model'
import { PAYMENT_PURPOSE_LABELS } from './labels'
import { useRegisterPayment } from './hooks'

const LIST = '/cartera/pagos'

const PURPOSES = ['RECEIVABLE', 'ADVANCE', 'DIRECT_INCOME'].map((value) => ({
  value,
  label: PAYMENT_PURPOSE_LABELS[value] ?? value,
}))

const COPY: SettlementCopy = {
  action: 'Registrar pago',
  party: 'Pagador',
  partyMissing: 'Selecciona el pagador',
  account: 'Cuenta destino',
  directConcept: 'Concepto del ingreso',
  directConceptMissing: 'Selecciona el concepto del ingreso',
  allocate: 'Aplicar a cuentas por cobrar',
  open: ['cuenta abierta', 'cuentas abiertas'],
  settleAll: 'Cobrar todo',
  nothingOpen: 'Este pagador no tiene cuentas abiertas. El pago queda como saldo a su favor.',
  leftover: 'Lo que sobre queda como saldo a favor del pagador.',
}

/**
 * Dinero que entra. Es el espejo de registrar un egreso, así que comparte el
 * formulario (`SettlementDrawer`) y solo aporta lo suyo: las palabras, las
 * cuentas por cobrar del pagador y la llamada al contrato.
 */
export function RegisterPaymentPage() {
  const navigate = useNavigate()
  const { orgId } = useCurrentOrg()
  const oid = orgId ?? ''
  const [searchParams] = useSearchParams()
  const [idempotencyKey] = useState(() => crypto.randomUUID())
  const register = useRegisterPayment(oid, idempotencyKey)

  // Se siembra desde la cuenta de la que se venía: llegar aquí con el pagador
  // ya puesto es la mitad del formulario resuelta.
  const [payerId, setPayerId] = useState<string | null>(searchParams.get('payer'))
  // Quien llegó desde una cuenta por cobrar vuelve a ella, no a la ficha del
  // pago: lo que estaba mirando era la cartera.
  const back = returnPath(searchParams)

  const { items: concepts } = useBillingConcepts(orgId, {
    page: 1,
    pageSize: 100,
    isActive: 'true',
    sort: 'name',
    order: 'asc',
  })
  const { items: receivables } = useReceivables(oid, {
    page: 1,
    pageSize: 100,
    payerContactId: payerId || undefined,
    order: 'asc',
  })
  const openAccounts = useMemo(
    () =>
      payerId
        ? receivables.filter(isOpenAccount).map((r) => ({
            id: r.receivableId,
            dueDate: r.dueDate,
            balance: r.balance,
            currency: r.currency,
          }))
        : [],
    [payerId, receivables],
  )

  const onSubmit = async (v: SettlementValues) => {
    const allocations: RegisterPaymentAllocationsItem[] = v.allocations.map((a) => ({
      receivableId: a.id,
      amount: a.amount,
    }))
    try {
      const res = await register.mutateAsync({
        orgId: oid,
        data: {
          paymentMethodId: v.paymentMethodId,
          financialAccountId: v.financialAccountId,
          payerContactId: payerId ?? undefined,
          purpose: v.purpose as 'RECEIVABLE' | 'ADVANCE' | 'DIRECT_INCOME',
          directBillingConceptId: v.directConceptId,
          receivedAt: new Date(v.date).toISOString(),
          amount: v.amount,
          reference: v.reference,
          allocations: allocations.length ? allocations : undefined,
        },
      })
      const detail = res.data as PaymentDetail
      toast.success('Pago registrado')
      navigate(back ?? `${LIST}/${detail.payment.id}`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo registrar el pago'))
    }
  }

  return (
    <SettlementDrawer
      closeTo={back ?? LIST}
      copy={COPY}
      purposes={PURPOSES}
      applyPurpose="RECEIVABLE"
      directPurpose="DIRECT_INCOME"
      directConcepts={concepts}
      partyId={payerId}
      onPartyChange={setPayerId}
      openAccounts={openAccounts}
      amountInfo="Monto total recibido. Los miles se separan solos; usa coma para decimales. Luego puedes repartirlo entre las cuentas por cobrar de abajo."
      isSubmitting={register.isPending}
      onSubmit={onSubmit}
    />
  )
}
