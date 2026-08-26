import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
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
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'
import { useFinancialAccounts, usePaymentMethods } from '@/features/masters/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { formatAmount, formatMoney, formatDateHuman, plural, todayISODate } from '@/lib/format'
import {
  allocationEntries,
  fillAll,
  sumAllocations,
  type Allocation,
  type OpenAccount,
  type SettlementCopy,
  type SettlementValues,
} from '@/lib/settlement'

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

/** Céntimos de tolerancia. Comparar dinero en coma flotante sin esto miente. */
const EPSILON = 0.001

/**
 * **Registrar dinero que entra o que sale.** Un solo formulario para las dos
 * caras: cobrar es pagar mirado desde el otro lado.
 *
 * Antes eran dos archivos de trescientas líneas, idénticos salvo por una docena
 * de palabras y el endpoint. Cada arreglo había que hacerlo dos veces —y en la
 * práctica se hacía en uno—, así que las dos pantallas se fueron separando. Lo
 * que cambia de verdad viaja en `copy` y en `onSubmit`; lo demás es común.
 *
 * **Se eligen cuentas y el monto se suma solo**, que es el orden en el que
 * piensa quien cobra: «me pagó mayo, junio y julio», no «$1.140.000, y ahora lo
 * reparto». Antes iba al revés —el total arriba, obligatorio, y un reparto
 * manual abajo—, así que la misma aritmética había que hacerla dos veces: una
 * en la cabeza para escribir el total y otra en la pantalla para deshacerlo. El
 * campo sigue siendo editable, porque un anticipo y un ingreso directo no
 * tienen cuentas que sumar y porque un pago puede traer de más.
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
  preselectedAccountId,
  statusOf,
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
  /** La cuenta desde la que se entró, que llega ya marcada por su saldo entero. */
  preselectedAccountId?: string | null
  /** Tono y etiqueta del estado de una cuenta. Es distinto en cada cara (§88.5). */
  statusOf: (status: string) => { tone: StatusTone; label: string }
  amountInfo: string
  isSubmitting: boolean
  onSubmit: (values: SettlementValues) => Promise<void>
}) {
  const { orgId } = useCurrentOrg()
  const oid = orgId ?? ''

  const [purpose, setPurpose] = useState(purposes[0]?.value ?? '')
  const [alloc, setAlloc] = useState<Allocation>({})
  /**
   * Si el monto lo escribió una persona. Mientras sea `false` lo manda la
   * selección; en cuanto alguien lo toca, es suyo y deja de recalcularse.
   *
   * **Tocar incluye vaciarlo.** Se probó lo contrario —que el campo vacío
   * volviera a seguir a la selección— y peleaba con quien quiere escribir otro
   * número: borras para teclear, y la cifra reaparece antes de que llegues a la
   * primera tecla. Volver al total de lo marcado es una salida que se ofrece
   * abajo, no algo que pase solo.
   */
  const [amountTyped, setAmountTyped] = useState(false)

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
  const assigned = useMemo(() => sumAllocations(alloc), [alloc])
  const selectedCount = useMemo(
    () => Object.values(alloc).filter((v) => Number(v) > 0).length,
    [alloc],
  )
  const unassigned = amountNum - assigned
  const overAssigned = unassigned < -EPSILON
  const currency = openAccounts[0]?.currency

  /**
   * Un reparto solo vale para las cuentas que tiene delante. Cambiar de contacto
   * —o de propósito— dejaba las filas del anterior en el estado, invisibles, y
   * viajaban en el POST: cuentas de otra persona dentro de este pago. Y con
   * ellas se va el monto, si es que lo puso la selección y no una persona.
   */
  const resetAllocation = () => {
    setAlloc({})
    if (!amountTyped) setValue('amount', '')
  }

  /**
   * La cuenta desde la que se entró llega marcada, y **solo la primera vez**:
   * las cuentas aparecen cuando responde el API, así que sin este cerrojo el
   * efecto volvería a marcarla cada vez que la lista se recalcula y pisaría lo
   * que se estuviera eligiendo.
   */
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current || !preselectedAccountId || openAccounts.length === 0) return
    const target = openAccounts.find((a) => a.id === preselectedAccountId)
    seeded.current = true
    if (target) setAlloc({ [target.id]: Number(target.balance).toFixed(2) })
  }, [preselectedAccountId, openAccounts])

  /**
   * El monto sigue a la selección mientras nadie lo haya escrito a mano. Se deja
   * vacío cuando no hay nada marcado en vez de poner un `0`: un campo obligatorio
   * que ya trae un cero parece relleno, y su error nunca llega a explicarse.
   */
  useEffect(() => {
    if (!isApply || amountTyped) return
    setValue('amount', assigned > 0 ? assigned.toFixed(2) : '', { shouldValidate: false })
  }, [assigned, isApply, amountTyped, setValue])

  const setRow = (id: string, raw: string) => setAlloc((prev) => ({ ...prev, [id]: raw }))

  const allSelected = openAccounts.length > 0 && selectedCount === openAccounts.length
  const toggleAll = () => setAlloc(allSelected ? {} : fillAll(openAccounts))

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
      toast.error(
        `Lo repartido supera el monto por ${formatAmount(Math.abs(unassigned).toFixed(2), currency)}`,
      )
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
      allocations: isApply ? allocationEntries(alloc) : [],
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
            onChange={(value) => {
              setPurpose(value)
              resetAllocation()
            }}
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
            <ContactPicker
              label={copy.party}
              orgId={oid}
              value={partyId}
              onChange={(id) => {
                onPartyChange(id)
                resetAllocation()
              }}
              allowClear
            />
          </Field>
        )}

        {/*
          Va antes del monto porque es lo que lo decide, y justo detrás del
          contacto porque es la pregunta de la pantalla. Estaba al final, después
          de fecha y referencia: en un teléfono quedaba fuera de la pantalla y se
          registraban pagos sin aplicar sin saber que había dónde aplicarlos.
        */}
        {isApply && partyId && (
          <AccountPicker
            copy={copy}
            accounts={openAccounts}
            concepts={directConcepts}
            statusOf={statusOf}
            alloc={alloc}
            onRow={setRow}
            allSelected={allSelected}
            onToggleAll={toggleAll}
            totalOpen={totalOpen}
            currency={currency}
          />
        )}

        <MoneyField
          control={control}
          name="amount"
          label="Monto"
          id="s-amount"
          required
          error={errors.amount?.message}
          info={amountInfo}
          onValueChange={() => setAmountTyped(true)}
        />

        {isApply && partyId && openAccounts.length > 0 && (
          <AllocationSummary
            copy={copy}
            selectedCount={selectedCount}
            assigned={assigned}
            unassigned={unassigned}
            overAssigned={overAssigned}
            currency={currency}
            onUseAssigned={
              amountTyped && assigned > EPSILON && Math.abs(unassigned) > EPSILON
                ? () => {
                    setValue('amount', assigned.toFixed(2), { shouldValidate: true })
                    setAmountTyped(false)
                  }
                : undefined
            }
          />
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
      </form>
    </DetailDrawer>
  )
}

/**
 * Qué cuentas cubre este movimiento.
 *
 * **Marcar es el gesto y el importe es la excepción**: la casilla pone el saldo
 * entero —que es lo que pasa casi siempre— y el campo de al lado solo hace falta
 * para un abono parcial. No hay dos estados: una cuenta está marcada porque
 * tiene importe, así que teclear una cifra la marca y borrarla la desmarca, y no
 * existe la casilla marcada que no aporta nada.
 *
 * Cada fila dice **de qué es** y **cómo está**. Antes decía «Vence 5 may» y un
 * saldo: cinco pensiones seguidas eran cinco filas que no se distinguían entre
 * sí, y desde luego no se veía cuál estaba vencida.
 */
function AccountPicker({
  copy,
  accounts,
  concepts,
  statusOf,
  alloc,
  onRow,
  allSelected,
  onToggleAll,
  totalOpen,
  currency,
}: {
  copy: SettlementCopy
  accounts: OpenAccount[]
  /** El catálogo que la pantalla ya carga, para decir de qué es cada fila (§95.19). */
  concepts: { id: string; name: string }[]
  statusOf: (status: string) => { tone: StatusTone; label: string }
  alloc: Allocation
  onRow: (id: string, raw: string) => void
  allSelected: boolean
  onToggleAll: () => void
  totalOpen: number
  currency?: string
}) {
  const nameOf = (catalogId?: string) => concepts.find((c) => c.id === catalogId)?.name

  return (
    <section className="space-y-3 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-medium">{copy.allocate}</h3>
          {accounts.length > 0 && (
            <p className="nums text-muted-foreground flex flex-wrap gap-x-2 text-xs">
              <span>{plural(accounts.length, copy.open[0], copy.open[1])}</span>
              <span>{formatMoney(totalOpen.toFixed(2), currency)}</span>
            </p>
          )}
        </div>
        {accounts.length > 0 && (
          <Button type="button" variant="outline" size="sm" onClick={onToggleAll}>
            {allSelected ? copy.clearAll : copy.selectAll}
          </Button>
        )}
      </div>

      {accounts.length === 0 ? (
        <p className="text-muted-foreground py-2 text-sm">{copy.nothingOpen}</p>
      ) : (
        <ul className="divide-y border-y">
          {accounts.map((account) => {
            const raw = alloc[account.id] ?? ''
            const checked = Number(raw) > 0
            const concept = nameOf(account.catalogId)
            const título = `${concept ? `${concept} · ` : ''}Vence ${formatDateHuman(account.dueDate)}`
            return (
              <li key={account.id} className="flex items-center gap-3 py-2 text-sm">
                {/*
                  La fila entera es el objetivo táctil (§43), y el <label> le
                  presta su texto a la casilla: sin él serían cinco casillas que
                  para un lector de pantalla se llaman igual (§46).
                */}
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-1">
                  <input
                    type="checkbox"
                    className="accent-primary size-4 shrink-0"
                    checked={checked}
                    onChange={() =>
                      onRow(account.id, checked ? '' : Number(account.balance).toFixed(2))
                    }
                  />
                  <span className="min-w-0">
                    <span className="block">{título}</span>
                    <span className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
                      <StatusBadge {...statusOf(account.status)} className="text-xs" />
                      <span className="nums whitespace-nowrap">
                        Saldo {formatAmount(account.balance, account.currency)}
                      </span>
                    </span>
                  </span>
                </label>
                <MoneyInput
                  className="h-9 w-32 px-2 text-right"
                  placeholder="0"
                  aria-label={`Importe · ${título}`}
                  value={raw}
                  onChange={(value) => onRow(account.id, value)}
                />
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/**
 * Qué va a pasar con el monto, **en una frase**.
 *
 * Antes eran una cifra rotulada «Sin asignar» y una nota que solo aparecía
 * cuando ya sobraba: había que restar mentalmente para saber si el pago cuadraba
 * y por qué. Los tres finales posibles —cuadra, sobra, no cabe— se dicen con
 * palabras, y la cifra va dentro de la frase.
 */
function AllocationSummary({
  copy,
  selectedCount,
  assigned,
  unassigned,
  overAssigned,
  currency,
  onUseAssigned,
}: {
  copy: SettlementCopy
  selectedCount: number
  assigned: number
  unassigned: number
  overAssigned: boolean
  currency?: string
  /** La vuelta atrás: cuadrar el monto con lo marcado. Solo si hay desajuste. */
  onUseAssigned?: () => void
}) {
  const volver = onUseAssigned && (
    <button
      type="button"
      onClick={onUseAssigned}
      className="nums text-brand block text-xs font-medium hover:underline"
    >
      Usar {formatMoney(assigned.toFixed(2), currency)}
    </button>
  )

  if (overAssigned) {
    return (
      <div className="space-y-1">
        <p className="text-destructive text-sm">
          Lo repartido supera el monto por{' '}
          <span className="nums font-medium">
            {formatMoney(Math.abs(unassigned).toFixed(2), currency)}
          </span>
          .
        </p>
        {volver}
      </div>
    )
  }

  if (unassigned > EPSILON) {
    return (
      <div className="space-y-1">
        <p className="text-muted-foreground text-sm">
          Sobran{' '}
          <span className="nums text-foreground font-medium">
            {formatMoney(unassigned.toFixed(2), currency)}
          </span>
          , que quedan {copy.leftover}.
        </p>
        {volver}
      </div>
    )
  }

  if (assigned > EPSILON) {
    return (
      <p className="text-muted-foreground text-sm">
        Se aplica completo a {plural(selectedCount, copy.unit[0], copy.unit[1])}.
      </p>
    )
  }

  return (
    <p className="text-muted-foreground text-sm">
      Marca lo que cubre este movimiento y el monto se suma solo.
    </p>
  )
}
