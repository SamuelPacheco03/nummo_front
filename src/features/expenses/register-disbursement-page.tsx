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
import { useExpenseCategories, useFinancialAccounts, usePaymentMethods } from '@/features/masters/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { getErrorMessage } from '@/lib/errors'
import { formatAmount, formatDateHuman, todayISODate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { DisbursementDetail, RegisterDisbursementAllocationsItem } from '@/api/generated/model'
import { DISBURSEMENT_PURPOSE_LABELS } from './labels'
import { useExpenses, useRegisterDisbursement } from './hooks'

const AMOUNT_RE = /^\d+(\.\d{1,2})?$/
const OPEN = new Set(['PENDING', 'PARTIAL', 'OVERDUE'])
type Purpose = 'EXPENSE' | 'ADVANCE' | 'DIRECT_EXPENSE'

const schema = z.object({
  paymentMethodId: z.string().min(1, 'Selecciona el método'),
  financialAccountId: z.string().min(1, 'Selecciona la cuenta'),
  amount: z
    .string()
    .trim()
    .min(1, 'Obligatorio')
    .refine((v) => AMOUNT_RE.test(v), 'Monto inválido'),
  disbursedAt: z.string().min(1, 'Obligatoria'),
  reference: z.string().trim().max(120).optional(),
  directExpenseCategoryId: z.string().optional(),
})
type Values = z.infer<typeof schema>

const PURPOSES: Purpose[] = ['EXPENSE', 'ADVANCE', 'DIRECT_EXPENSE']

const LIST = '/gastos/egresos'
/** El botón de guardar vive en el pie del cajón, fuera del <form>. */
const FORM_ID = 'register-disbursement-form'

export function RegisterDisbursementPage() {
  const navigate = useNavigate()
  const { orgId } = useCurrentOrg()
  const oid = orgId ?? ''
  const [searchParams] = useSearchParams()
  const [idempotencyKey] = useState(() => crypto.randomUUID())
  const register = useRegisterDisbursement(oid, idempotencyKey)

  const [purpose, setPurpose] = useState<Purpose>('EXPENSE')
  const [supplierId, setSupplierId] = useState<string | null>(searchParams.get('supplier'))
  const [alloc, setAlloc] = useState<Record<string, string>>({})

  const { items: methods } = usePaymentMethods(orgId, { page: 1, pageSize: 100, isActive: 'true', sort: 'name', order: 'asc' })
  const { items: accounts } = useFinancialAccounts(orgId, { page: 1, pageSize: 100, isActive: 'true', sort: 'name', order: 'asc' })
  const { items: categories } = useExpenseCategories(orgId, { page: 1, pageSize: 100, isActive: 'true', sort: 'name', order: 'asc' })

  const {
    register: rhf,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { paymentMethodId: '', financialAccountId: '', amount: '', disbursedAt: todayISODate(), reference: '', directExpenseCategoryId: '' },
  })

  // Automático: si solo hay un método o una cuenta, se preseleccionan.
  useEffect(() => {
    if (methods.length === 1) setValue('paymentMethodId', methods[0].id)
  }, [methods, setValue])
  useEffect(() => {
    if (accounts.length === 1) setValue('financialAccountId', accounts[0].id)
  }, [accounts, setValue])

  const amountNum = Number(watch('amount')) || 0

  const { items: allExpenses } = useExpenses(oid, { page: 1, pageSize: 100, supplierContactId: supplierId || undefined, order: 'asc' })
  const openExpenses = useMemo(
    () => (supplierId ? allExpenses.filter((e) => OPEN.has(e.displayStatus) && Number(e.balance) > 0) : []),
    [supplierId, allExpenses],
  )
  const totalOpen = useMemo(
    () => openExpenses.reduce((s, e) => s + (Number(e.balance) || 0), 0),
    [openExpenses],
  )
  const assigned = useMemo(() => Object.values(alloc).reduce((s, v) => s + (Number(v) || 0), 0), [alloc])
  const unassigned = amountNum - assigned

  const autoAllocate = () => {
    let remaining = amountNum
    const next: Record<string, string> = {}
    for (const e of openExpenses) {
      if (remaining <= 0) break
      const take = Math.min(Number(e.balance), remaining)
      if (take > 0) {
        next[e.expenseId] = take.toFixed(2)
        remaining -= take
      }
    }
    setAlloc(next)
  }

  // Pagar todo: pone la deuda total en el monto y la reparte entre los gastos.
  const payAll = () => {
    const next: Record<string, string> = {}
    openExpenses.forEach((e) => {
      next[e.expenseId] = Number(e.balance).toFixed(2)
    })
    setAlloc(next)
    setValue('amount', totalOpen.toFixed(2), { shouldValidate: true })
  }

  const onSubmit = handleSubmit(async (v) => {
    if ((purpose === 'EXPENSE' || purpose === 'ADVANCE') && !supplierId) {
      toast.error('Selecciona el proveedor')
      return
    }
    if (purpose === 'DIRECT_EXPENSE' && !v.directExpenseCategoryId) {
      toast.error('Selecciona la categoría del egreso')
      return
    }
    const allocations: RegisterDisbursementAllocationsItem[] =
      purpose === 'EXPENSE'
        ? Object.entries(alloc)
            .filter(([, amt]) => Number(amt) > 0)
            .map(([expenseId, amount]) => ({ expenseId, amount: Number(amount).toFixed(2) }))
        : []
    if (assigned > amountNum + 0.001) {
      toast.error('Lo asignado supera el monto del egreso')
      return
    }
    try {
      const res = await register.mutateAsync({
        orgId: oid,
        data: {
          paymentMethodId: v.paymentMethodId,
          financialAccountId: v.financialAccountId,
          supplierContactId: supplierId ?? undefined,
          purpose,
          directExpenseCategoryId: purpose === 'DIRECT_EXPENSE' ? v.directExpenseCategoryId : undefined,
          disbursedAt: new Date(v.disbursedAt).toISOString(),
          amount: v.amount,
          reference: v.reference || undefined,
          allocations: allocations.length ? allocations : undefined,
        },
      })
      const detail = res.data as DisbursementDetail
      toast.success('Egreso registrado')
      navigate(`/gastos/egresos/${detail.disbursement.id}`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo registrar el egreso'))
    }
  })

  return (
    <DetailDrawer
      closeTo={LIST}
      title="Registrar egreso"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(LIST)}>
            Cancelar
          </Button>
          {/* Fuera del <form>, así que se ata por id para poder enviarlo igual. */}
          <Button type="submit" form={FORM_ID} disabled={register.isPending}>
            {register.isPending && <Loader size="sm" />}
            Registrar egreso
          </Button>
        </div>
      }
    >
      <form id={FORM_ID} onSubmit={onSubmit} noValidate className="space-y-4">
            <div className="inline-flex flex-wrap rounded-md border p-0.5">
              {PURPOSES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPurpose(p)}
                  className={cn(
                    'rounded px-3 py-1.5 text-sm transition-colors',
                    purpose === p ? 'bg-secondary font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {DISBURSEMENT_PURPOSE_LABELS[p]}
                </button>
              ))}
            </div>

            {purpose !== 'DIRECT_EXPENSE' && (
              <Field label="Proveedor" required>
                <ContactPicker orgId={oid} value={supplierId} onChange={setSupplierId} allowClear />
              </Field>
            )}

            {purpose === 'DIRECT_EXPENSE' && (
              <Field label="Categoría del egreso" htmlFor="d-cat" required error={errors.directExpenseCategoryId?.message}>
                <NativeSelect id="d-cat" {...rhf('directExpenseCategoryId')}>
                  <option value="">Selecciona…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Método de pago" htmlFor="d-method" required error={errors.paymentMethodId?.message}>
                <NativeSelect id="d-method" {...rhf('paymentMethodId')}>
                  <option value="">Selecciona…</option>
                  {methods.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Cuenta origen" htmlFor="d-account" required error={errors.financialAccountId?.message}>
                <NativeSelect id="d-account" {...rhf('financialAccountId')}>
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
                  id="d-amount"
                  required
                  error={errors.amount?.message}
                  info="Monto total que pagas. Los miles se separan solos; luego puedes repartirlo entre los gastos de abajo."
                />
                {purpose === 'EXPENSE' && supplierId && totalOpen > 0 && (
                  <button
                    type="button"
                    onClick={payAll}
                    className="nums text-xs font-medium text-brand hover:underline"
                  >
                    Pagar todo: {formatAmount(totalOpen.toFixed(2), openExpenses[0]?.currency)}
                  </button>
                )}
              </div>
              <Field label="Fecha" htmlFor="d-date" required error={errors.disbursedAt?.message}>
                <Input id="d-date" type="date" {...rhf('disbursedAt')} />
              </Field>
              <Field label="Referencia" htmlFor="d-ref" error={errors.reference?.message}>
                <Input id="d-ref" {...rhf('reference')} />
              </Field>
            </div>

            {purpose === 'EXPENSE' && supplierId && (
              <div className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Aplicar a gastos</span>
                  <Button type="button" variant="outline" size="sm" onClick={autoAllocate} disabled={!amountNum || openExpenses.length === 0}>
                    <Wand2 className="size-4" />
                    Automático
                  </Button>
                </div>
                {openExpenses.length === 0 ? (
                  <p className="py-3 text-center text-sm text-muted-foreground">
                    Este proveedor no tiene gastos abiertos. Se registrará como anticipo sin asignar.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {openExpenses.map((e) => (
                      <li key={e.expenseId} className="flex items-center gap-3 py-2 text-sm">
                        <div className="min-w-0 flex-1">
                          <div className="truncate">{formatDateHuman(e.dueDate)}</div>
                          <div className="nums text-xs text-muted-foreground">Saldo {formatAmount(e.balance, e.currency)}</div>
                        </div>
                        <MoneyInput
                          className="h-8 w-32 text-right"
                          placeholder="0"
                          value={alloc[e.expenseId] ?? ''}
                          onChange={(raw) => setAlloc((prev) => ({ ...prev, [e.expenseId]: raw }))}
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
