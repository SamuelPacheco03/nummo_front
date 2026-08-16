import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Wand2 } from 'lucide-react'
import { ContactPicker } from '@/components/contact-picker'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { DetailDrawer } from '@/components/ui/detail-drawer'
import { Field } from '@/components/ui/field'
import { MoneyField } from '@/components/money-field'
import { MoneyInput } from '@/components/ui/money-input'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { useBillingConcepts, useFinancialAccounts, usePaymentMethods } from '@/features/masters/hooks'
import { useReceivables } from '@/features/receivables/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { getErrorMessage } from '@/lib/errors'
import { formatAmount, formatDateHuman, todayISODate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { PaymentDetail, RegisterPaymentAllocationsItem } from '@/api/generated/model'
import { PAYMENT_PURPOSE_LABELS } from './labels'
import { useRegisterPayment } from './hooks'

const AMOUNT_RE = /^\d+(\.\d{1,2})?$/
const OPEN = new Set(['PENDING', 'PARTIAL', 'OVERDUE'])
type Purpose = 'RECEIVABLE' | 'ADVANCE' | 'DIRECT_INCOME'

const schema = z.object({
  paymentMethodId: z.string().min(1, 'Selecciona el método'),
  financialAccountId: z.string().min(1, 'Selecciona la cuenta'),
  amount: z
    .string()
    .trim()
    .min(1, 'Obligatorio')
    .refine((v) => AMOUNT_RE.test(v), 'Monto inválido'),
  receivedAt: z.string().min(1, 'Obligatoria'),
  reference: z.string().trim().max(120).optional(),
  directBillingConceptId: z.string().optional(),
})
type Values = z.infer<typeof schema>

const PURPOSES: Purpose[] = ['RECEIVABLE', 'ADVANCE', 'DIRECT_INCOME']

const LIST = '/cartera/pagos'
/** El botón de guardar vive en el pie del cajón, fuera del <form>. */
const FORM_ID = 'register-payment-form'

export function RegisterPaymentPage() {
  const navigate = useNavigate()
  const { orgId } = useCurrentOrg()
  const oid = orgId ?? ''
  const [searchParams] = useSearchParams()
  const [idempotencyKey] = useState(() => crypto.randomUUID())
  const register = useRegisterPayment(oid, idempotencyKey)

  const [purpose, setPurpose] = useState<Purpose>('RECEIVABLE')
  const [payerId, setPayerId] = useState<string | null>(searchParams.get('payer'))
  const [alloc, setAlloc] = useState<Record<string, string>>({})

  const { items: methods } = usePaymentMethods(orgId, { page: 1, pageSize: 100, isActive: 'true', sort: 'name', order: 'asc' })
  const { items: accounts } = useFinancialAccounts(orgId, { page: 1, pageSize: 100, isActive: 'true', sort: 'name', order: 'asc' })
  const { items: concepts } = useBillingConcepts(orgId, { page: 1, pageSize: 100, isActive: 'true', sort: 'name', order: 'asc' })

  const {
    register: rhf,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      paymentMethodId: '',
      financialAccountId: '',
      amount: '',
      receivedAt: todayISODate(),
      reference: '',
      directBillingConceptId: '',
    },
  })

  // Automático: si solo hay un método o una cuenta, se preseleccionan.
  useEffect(() => {
    if (methods.length === 1) setValue('paymentMethodId', methods[0].id)
  }, [methods, setValue])
  useEffect(() => {
    if (accounts.length === 1) setValue('financialAccountId', accounts[0].id)
  }, [accounts, setValue])

  const amountStr = watch('amount')
  const amountNum = Number(amountStr) || 0

  // Cuentas por cobrar abiertas del pagador (para abonos).
  const { items: allReceivables } = useReceivables(oid, {
    page: 1,
    pageSize: 100,
    payerContactId: payerId || undefined,
    order: 'asc',
  })
  const openReceivables = useMemo(
    () => (payerId ? allReceivables.filter((r) => OPEN.has(r.displayStatus) && Number(r.balance) > 0) : []),
    [payerId, allReceivables],
  )
  const totalOpen = useMemo(
    () => openReceivables.reduce((s, r) => s + (Number(r.balance) || 0), 0),
    [openReceivables],
  )

  const assigned = useMemo(
    () => Object.values(alloc).reduce((s, v) => s + (Number(v) || 0), 0),
    [alloc],
  )
  const unassigned = amountNum - assigned

  const autoAllocate = () => {
    let remaining = amountNum
    const next: Record<string, string> = {}
    for (const r of openReceivables) {
      if (remaining <= 0) break
      const bal = Number(r.balance)
      const take = Math.min(bal, remaining)
      if (take > 0) {
        next[r.receivableId] = take.toFixed(2)
        remaining -= take
      }
    }
    setAlloc(next)
  }

  // Cobrar todo: pone la deuda total en el monto y la reparte entre las cuentas.
  const collectAll = () => {
    const next: Record<string, string> = {}
    openReceivables.forEach((r) => {
      next[r.receivableId] = Number(r.balance).toFixed(2)
    })
    setAlloc(next)
    setValue('amount', totalOpen.toFixed(2), { shouldValidate: true })
  }

  const onSubmit = handleSubmit(async (v) => {
    if ((purpose === 'RECEIVABLE' || purpose === 'ADVANCE') && !payerId) {
      toast.error('Selecciona el pagador')
      return
    }
    if (purpose === 'DIRECT_INCOME' && !v.directBillingConceptId) {
      toast.error('Selecciona el concepto del ingreso')
      return
    }
    const allocations: RegisterPaymentAllocationsItem[] =
      purpose === 'RECEIVABLE'
        ? Object.entries(alloc)
            .filter(([, amt]) => Number(amt) > 0)
            .map(([receivableId, amount]) => ({ receivableId, amount: Number(amount).toFixed(2) }))
        : []
    if (assigned > amountNum + 0.001) {
      toast.error('Lo asignado supera el monto del pago')
      return
    }

    try {
      const res = await register.mutateAsync({
        orgId: oid,
        data: {
          paymentMethodId: v.paymentMethodId,
          financialAccountId: v.financialAccountId,
          payerContactId: payerId ?? undefined,
          purpose,
          directBillingConceptId:
            purpose === 'DIRECT_INCOME' ? v.directBillingConceptId : undefined,
          receivedAt: new Date(v.receivedAt).toISOString(),
          amount: v.amount,
          reference: v.reference || undefined,
          allocations: allocations.length ? allocations : undefined,
        },
      })
      const detail = res.data as PaymentDetail
      toast.success('Pago registrado')
      navigate(`/cartera/pagos/${detail.payment.id}`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo registrar el pago'))
    }
  })

  return (
    <DetailDrawer
      closeTo={LIST}
      title="Registrar pago"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(LIST)}>
            Cancelar
          </Button>
          {/* Fuera del <form>, así que se ata por id para poder enviarlo igual. */}
          <Button type="submit" form={FORM_ID} disabled={register.isPending}>
            {register.isPending && <Loader size="sm" />}
            Registrar pago
          </Button>
        </div>
      }
    >
      <form id={FORM_ID} onSubmit={onSubmit} noValidate className="space-y-4">
            {/* Propósito */}
            <div className="inline-flex flex-wrap rounded-md border p-0.5">
              {PURPOSES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPurpose(p)}
                  className={cn(
                    'rounded px-3 py-1.5 text-sm transition-colors',
                    purpose === p
                      ? 'bg-secondary font-medium text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {PAYMENT_PURPOSE_LABELS[p]}
                </button>
              ))}
            </div>

            {purpose !== 'DIRECT_INCOME' && (
              <Field label="Pagador" required>
                <ContactPicker orgId={oid} value={payerId} onChange={setPayerId} allowClear />
              </Field>
            )}

            {purpose === 'DIRECT_INCOME' && (
              <Field label="Concepto del ingreso" htmlFor="p-concept" required error={errors.directBillingConceptId?.message}>
                <NativeSelect id="p-concept" {...rhf('directBillingConceptId')}>
                  <option value="">Selecciona…</option>
                  {concepts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Método de pago" htmlFor="p-method" required error={errors.paymentMethodId?.message}>
                <NativeSelect id="p-method" {...rhf('paymentMethodId')}>
                  <option value="">Selecciona…</option>
                  {methods.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Cuenta destino" htmlFor="p-account" required error={errors.financialAccountId?.message}>
                <NativeSelect id="p-account" {...rhf('financialAccountId')}>
                  <option value="">Selecciona…</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <MoneyField
                  control={control}
                  name="amount"
                  label="Monto"
                  id="p-amount"
                  required
                  error={errors.amount?.message}
                  info="Monto total recibido. Los miles se separan solos; usa coma para decimales. Luego puedes repartirlo entre las cuentas por cobrar de abajo."
                />
                {purpose === 'RECEIVABLE' && payerId && totalOpen > 0 && (
                  <button
                    type="button"
                    onClick={collectAll}
                    className="nums text-xs font-medium text-brand hover:underline"
                  >
                    Cobrar todo: {formatAmount(totalOpen.toFixed(2), openReceivables[0]?.currency)}
                  </button>
                )}
              </div>
              <Field label="Fecha" htmlFor="p-date" required error={errors.receivedAt?.message}>
                <Input id="p-date" type="date" {...rhf('receivedAt')} />
              </Field>
              <Field label="Referencia" htmlFor="p-ref" error={errors.reference?.message}>
                <Input id="p-ref" {...rhf('reference')} />
              </Field>
            </div>

            {/* Asignación a cuentas por cobrar */}
            {purpose === 'RECEIVABLE' && payerId && (
              <div className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Aplicar a cuentas por cobrar</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={autoAllocate}
                    disabled={!amountNum || openReceivables.length === 0}
                  >
                    <Wand2 className="size-4" />
                    Automático
                  </Button>
                </div>
                {openReceivables.length === 0 ? (
                  <p className="py-3 text-center text-sm text-muted-foreground">
                    Este pagador no tiene cuentas abiertas. Se registrará como crédito sin asignar.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {openReceivables.map((r) => (
                      <li key={r.receivableId} className="flex items-center gap-3 py-2 text-sm">
                        <div className="min-w-0 flex-1">
                          <div className="truncate">{formatDateHuman(r.dueDate)}</div>
                          <div className="text-xs text-muted-foreground nums">
                            Saldo {formatAmount(r.balance, r.currency)}
                          </div>
                        </div>
                        <MoneyInput
                          className="h-8 w-32 text-right"
                          placeholder="0"
                          value={alloc[r.receivableId] ?? ''}
                          onChange={(raw) =>
                            setAlloc((prev) => ({ ...prev, [r.receivableId]: raw }))
                          }
                        />
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex items-center justify-between border-t pt-2 text-sm">
                  <span className="text-muted-foreground">Asignado / Sin asignar</span>
                  <span className={cn('nums', unassigned < -0.001 && 'text-destructive')}>
                    {formatAmount(assigned.toFixed(2))} / {formatAmount(unassigned.toFixed(2))}
                  </span>
                </div>
              </div>
            )}
      </form>
    </DetailDrawer>
  )
}
