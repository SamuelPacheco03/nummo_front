import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Wand2 } from 'lucide-react'
import { ContactPicker } from '@/components/contact-picker'
import { MoneyField } from '@/components/money-field'
import { Button } from '@/components/ui/button'
import { DetailDrawer } from '@/components/ui/detail-drawer'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Loader } from '@/components/ui/loader'
import { MoneyInput } from '@/components/ui/money-input'
import { NativeSelect } from '@/components/ui/native-select'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { useFinancialAccounts, usePaymentMethods } from '@/features/masters/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { formatAmount, formatMoney, formatDateHuman, plural, todayISODate } from '@/lib/format'
import type { OpenAccount, SettlementCopy, SettlementValues } from '@/lib/settlement'
import { cn } from '@/lib/utils'

const AMOUNT_RE = /^\d+(\.\d{1,2})?$/

const schema = z.object({
  paymentMethodId: z.string().min(1, 'Selecciona el método'),
  financialAccountId: z.string().min(1, 'Selecciona la cuenta'),
  amount: z
    .string()
    .trim()
    .min(1, 'Obligatorio')
    .refine((v) => AMOUNT_RE.test(v), 'Monto inválido'),
  date: z.string().min(1, 'Obligatoria'),
  reference: z.string().trim().max(120).optional(),
  directConceptId: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

/** El botón de guardar vive en el pie del cajón, fuera del <form>. */
const FORM_ID = 'settlement-form'

/**
 * **Registrar dinero que entra o que sale.** Un solo formulario para las dos
 * caras: cobrar es pagar mirado desde el otro lado.
 *
 * Antes eran dos archivos de trescientas líneas, idénticos salvo por una docena
 * de palabras y el endpoint. Cada arreglo había que hacerlo dos veces —y en la
 * práctica se hacía en uno—, así que las dos pantallas se fueron separando. Lo
 * que cambia de verdad viaja en `copy` y en `onSubmit`; lo demás es común.
 *
 * Vive dentro del `Drawer` de la app (§94), como el detalle y los filtros: hoja
 * desde abajo en móvil, cajón por la derecha en escritorio.
 *
 * **Quién es el contacto lo lleva quien llama**, no este componente: el que
 * pregunta al API por las cuentas abiertas necesita saberlo antes de que este
 * formulario exista.
 */
export function SettlementDrawer({
  closeTo,
  copy,
  purposes,
  applyPurpose,
  directPurpose,
  directConcepts,
  partyId,
  onPartyChange,
  openAccounts,
  amountInfo,
  isSubmitting,
  onSubmit,
}: {
  /** Ruta a la que se vuelve al cerrar. */
  closeTo: string
  copy: SettlementCopy
  /** Los propósitos del contrato, en el orden en que se ofrecen. */
  purposes: { value: string; label: string }[]
  /** El propósito que reparte el dinero entre cuentas abiertas. */
  applyPurpose: string
  /** El propósito que cambia el contacto por un concepto suelto. */
  directPurpose: string
  directConcepts: { id: string; name: string }[]
  partyId: string | null
  onPartyChange: (id: string | null) => void
  /** Cuentas abiertas del contacto elegido. Vacío si no hay contacto. */
  openAccounts: OpenAccount[]
  amountInfo: string
  isSubmitting: boolean
  onSubmit: (values: SettlementValues) => Promise<void>
}) {
  const { orgId } = useCurrentOrg()
  const oid = orgId ?? ''

  const [purpose, setPurpose] = useState(purposes[0]?.value ?? '')
  const [alloc, setAlloc] = useState<Record<string, string>>({})

  const masters = { page: 1, pageSize: 100, isActive: 'true', sort: 'name', order: 'asc' } as const
  const { items: methods } = usePaymentMethods(orgId, masters)
  const { items: accounts } = useFinancialAccounts(orgId, masters)

  const {
    register: rhf,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      paymentMethodId: '',
      financialAccountId: '',
      amount: '',
      date: todayISODate(),
      reference: '',
      directConceptId: '',
    },
  })

  // Si solo hay un método o una cuenta, no hay nada que elegir: se preselecciona.
  useEffect(() => {
    if (methods.length === 1) setValue('paymentMethodId', methods[0].id)
  }, [methods, setValue])
  useEffect(() => {
    if (accounts.length === 1) setValue('financialAccountId', accounts[0].id)
  }, [accounts, setValue])

  const amountNum = Number(watch('amount')) || 0
  const isDirect = purpose === directPurpose
  const isApply = purpose === applyPurpose

  const totalOpen = useMemo(
    () => openAccounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0),
    [openAccounts],
  )
  const assigned = useMemo(
    () => Object.values(alloc).reduce((sum, v) => sum + (Number(v) || 0), 0),
    [alloc],
  )
  const unassigned = amountNum - assigned
  const overAssigned = unassigned < -0.001
  const currency = openAccounts[0]?.currency

  /** Reparte el monto entre las cuentas, de la más antigua a la más nueva. */
  const autoAllocate = () => {
    let remaining = amountNum
    const next: Record<string, string> = {}
    for (const account of openAccounts) {
      if (remaining <= 0) break
      const take = Math.min(Number(account.balance), remaining)
      if (take > 0) {
        next[account.id] = take.toFixed(2)
        remaining -= take
      }
    }
    setAlloc(next)
  }

  /** Al revés: pone la deuda entera en el monto y la reparte toda. */
  const settleAll = () => {
    const next: Record<string, string> = {}
    openAccounts.forEach((account) => {
      next[account.id] = Number(account.balance).toFixed(2)
    })
    setAlloc(next)
    setValue('amount', totalOpen.toFixed(2), { shouldValidate: true })
  }

  const submit = handleSubmit(async (v) => {
    if (!isDirect && !partyId) {
      toast.error(copy.partyMissing)
      return
    }
    if (isDirect && !v.directConceptId) {
      toast.error(copy.directConceptMissing)
      return
    }
    if (overAssigned) {
      toast.error(`Lo asignado supera el monto: sobran ${formatAmount(Math.abs(unassigned).toFixed(2), currency)}`)
      return
    }

    await onSubmit({
      purpose,
      paymentMethodId: v.paymentMethodId,
      financialAccountId: v.financialAccountId,
      amount: v.amount,
      date: v.date,
      reference: v.reference || undefined,
      directConceptId: isDirect ? v.directConceptId : undefined,
      allocations: isApply
        ? Object.entries(alloc)
            .filter(([, amount]) => Number(amount) > 0)
            .map(([id, amount]) => ({ id, amount: Number(amount).toFixed(2) }))
        : [],
    })
  })

  return (
    <DetailDrawer
      closeTo={closeTo}
      title={copy.action}
      footer={
        // Fuera del <form>, así que se ata por id para poder enviarlo igual.
        <Button type="submit" form={FORM_ID} disabled={isSubmitting} className="w-full">
          {isSubmitting && <Loader size="sm" />}
          {copy.action}
        </Button>
      }
    >
      <form id={FORM_ID} onSubmit={submit} noValidate className="space-y-5">
        {/*
          El propósito manda sobre el resto del formulario, así que va primero y
          con pregunta encima: sin ella son tres palabras sueltas y no se sabe
          que cambian los campos de abajo.
        */}
        <div className="space-y-2">
          <span className="block text-sm font-medium">¿Qué estás registrando?</span>
          <SegmentedControl
            options={purposes}
            value={purpose}
            onChange={setPurpose}
            aria-label="Qué estás registrando"
          />
        </div>

        {isDirect ? (
          <Field
            label={copy.directConcept}
            htmlFor="s-concept"
            required
            error={errors.directConceptId?.message}
          >
            <NativeSelect id="s-concept" {...rhf('directConceptId')}>
              <option value="">Selecciona…</option>
              {directConcepts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        ) : (
          <Field label={copy.party} required>
            <ContactPicker orgId={oid} value={partyId} onChange={onPartyChange} allowClear />
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Método de pago"
            htmlFor="s-method"
            required
            error={errors.paymentMethodId?.message}
          >
            <NativeSelect id="s-method" {...rhf('paymentMethodId')}>
              <option value="">Selecciona…</option>
              {methods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field
            label={copy.account}
            htmlFor="s-account"
            required
            error={errors.financialAccountId?.message}
          >
            <NativeSelect id="s-account" {...rhf('financialAccountId')}>
              <option value="">Selecciona…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>

        <div className="space-y-1.5">
          <MoneyField
            control={control}
            name="amount"
            label="Monto"
            id="s-amount"
            required
            error={errors.amount?.message}
            info={amountInfo}
          />
          {isApply && partyId && totalOpen > 0 && (
            <button
              type="button"
              onClick={settleAll}
              className="nums text-brand text-xs font-medium hover:underline"
            >
              {copy.settleAll}: {formatMoney(totalOpen.toFixed(2), currency)}
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fecha" htmlFor="s-date" required error={errors.date?.message}>
            <Input id="s-date" type="date" {...rhf('date')} />
          </Field>
          <Field
            label="Referencia"
            htmlFor="s-ref"
            hint="Número de transferencia, recibo…"
            error={errors.reference?.message}
          >
            <Input id="s-ref" {...rhf('reference')} />
          </Field>
        </div>

        {isApply && partyId && (
          <AllocationBox
            copy={copy}
            accounts={openAccounts}
            alloc={alloc}
            onAlloc={(id, raw) => setAlloc((prev) => ({ ...prev, [id]: raw }))}
            onAuto={autoAllocate}
            canAuto={amountNum > 0 && openAccounts.length > 0}
            unassigned={unassigned}
            overAssigned={overAssigned}
            currency={currency}
          />
        )}
      </form>
    </DetailDrawer>
  )
}

/**
 * A qué cuentas va el dinero.
 *
 * De las dos cifras que se podían enseñar al pie —lo asignado y lo que sobra—
 * solo se enseña **lo que sobra**: lo asignado ya está sumado a la vista en los
 * campos de arriba, y sobrar es lo que tiene consecuencias (queda a favor, o no
 * cuadra). Antes iban las dos juntas separadas por una barra y había que
 * averiguar cuál era cuál.
 */
function AllocationBox({
  copy,
  accounts,
  alloc,
  onAlloc,
  onAuto,
  canAuto,
  unassigned,
  overAssigned,
  currency,
}: {
  copy: SettlementCopy
  accounts: OpenAccount[]
  alloc: Record<string, string>
  onAlloc: (id: string, raw: string) => void
  onAuto: () => void
  canAuto: boolean
  unassigned: number
  overAssigned: boolean
  currency?: string
}) {
  return (
    <section className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-medium">{copy.allocate}</h3>
          {accounts.length > 0 && (
            <p className="text-muted-foreground text-xs">
              {plural(accounts.length, copy.open[0], copy.open[1])}
            </p>
          )}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onAuto} disabled={!canAuto}>
          <Wand2 aria-hidden className="size-4" />
          Repartir
        </Button>
      </div>

      {accounts.length === 0 ? (
        <p className="text-muted-foreground py-2 text-sm">{copy.nothingOpen}</p>
      ) : (
        <ul className="divide-y border-y">
          {accounts.map((account) => (
            <li key={account.id} className="flex items-center gap-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate">Vence {formatDateHuman(account.dueDate)}</p>
                <p className="nums text-muted-foreground text-xs">
                  Saldo {formatAmount(account.balance, account.currency)}
                </p>
              </div>
              <MoneyInput
                className="h-9 w-32 text-right"
                placeholder="0"
                aria-label={`Aplicar a la cuenta que vence ${formatDateHuman(account.dueDate)}`}
                value={alloc[account.id] ?? ''}
                onChange={(raw) => onAlloc(account.id, raw)}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted-foreground shrink-0">Sin asignar</span>
        <span className={cn('nums font-medium', overAssigned && 'text-destructive')}>
          {formatAmount(unassigned.toFixed(2), currency)}
        </span>
      </div>
      {overAssigned ? (
        <p className="text-destructive text-xs">Lo repartido supera el monto que registras.</p>
      ) : (
        unassigned > 0.001 && <p className="text-muted-foreground text-xs">{copy.leftover}</p>
      )}
    </section>
  )
}
