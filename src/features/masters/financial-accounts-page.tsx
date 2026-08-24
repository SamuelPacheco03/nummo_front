import { useEffect, useMemo, useState } from 'react'
import { Wallet } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Field } from '@/components/ui/field'
import { FormDialog } from '@/components/ui/form-dialog'
import { MoneyField } from '@/components/money-field'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { useBranches } from '@/features/config/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { useCan } from '@/features/platform/permissions'
import { toastApiError } from '@/features/platform/errors'
import type { ListResult } from '@/lib/list-result'
import { formatAmount } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AccountPaymentDetails, FinancialAccount } from '@/api/generated/model'
import { MasterCrud, type Column } from './master-crud'
import {
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABELS,
  BANK_ACCOUNT_KINDS,
  isValidAmount,
  TRANSFER_KEY_KINDS,
} from './labels'
import { useCreateFinancialAccount, useFinancialAccounts, useUpdateFinancialAccount } from './hooks'
import type { MasterParams } from './hooks'

const schema = z
  .object({
    name: z.string().trim().min(1, 'El nombre es obligatorio').max(160),
    accountType: z.enum(['CASH', 'BANK', 'DIGITAL_WALLET', 'OTHER']),
    currency: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || v.length === 3, 'Usa 3 letras (ej. COP)'),
    openingBalance: z.string().trim().optional().refine(isValidAmount, 'Monto inválido'),
    openingBalanceDate: z.string().trim().optional(),
    branchId: z.string().optional(),
    isActive: z.boolean().optional(),
    /*
      Los datos de pago de las dos formas viven **juntos y planos**, y se validan
      según el tipo de cuenta. Un esquema discriminado obligaría a remontar el
      formulario al cambiar de tipo, y con él se perdería lo ya escrito.

      Ninguno es un `textarea`, y no es un descuido: estos textos acaban dentro de
      un parámetro de plantilla de WhatsApp, y Meta rechaza el envío entero si
      lleva saltos de línea.
    */
    bankName: z.string().trim().max(60).optional(),
    accountKind: z.enum(['SAVINGS', 'CHECKING']).or(z.literal('')).optional(),
    accountNumber: z.string().trim().max(40).optional(),
    holderName: z.string().trim().max(120).optional(),
    holderDocument: z.string().trim().max(40).optional(),
    transferKeyKind: z
      .enum(['PHONE', 'EMAIL', 'DOCUMENT', 'ALPHANUMERIC'])
      .or(z.literal(''))
      .optional(),
    transferKeyValue: z.string().trim().max(120).optional(),
    provider: z.string().trim().max(40).optional(),
    phone: z.string().trim().max(25).optional(),
    publishInReminders: z.boolean().optional(),
  })
  .superRefine((v, ctx) => {
    const need = (campo: keyof typeof v, mensaje: string) => {
      if (!v[campo]) ctx.addIssue({ code: 'custom', path: [campo], message: mensaje })
    }
    /*
      Los datos solo son obligatorios **al publicar**. Una cuenta de banco que
      solo sirve para cuadrar la caja no tiene por qué llevarlos, y exigírselos
      convertiría un maestro de contabilidad en un formulario de cobranza.
    */
    if (v.publishInReminders) {
      if (v.accountType === 'BANK') {
        need('bankName', 'De qué banco es.')
        need('accountKind', 'Ahorros o corriente: consignar a la que no es rebota.')
        need('accountNumber', 'Sin el número no se puede consignar.')
        need('holderName', 'A nombre de quién está.')
      } else if (v.accountType === 'DIGITAL_WALLET') {
        need('provider', 'Nequi, Daviplata…')
        need('phone', 'El celular al que se le manda.')
      } else {
        ctx.addIssue({
          code: 'custom',
          path: ['publishInReminders'],
          // Publicar una caja le diría al deudor que venga a pagar en efectivo a
          // una caja que no sabe dónde está.
          message: 'Una caja no tiene dónde consignar: publica una cuenta de banco o billetera.',
        })
      }
    }
    // La llave es un par: media llave no lleva a ninguna parte.
    if (v.transferKeyKind && !v.transferKeyValue) need('transferKeyValue', 'La llave en sí.')
    if (v.transferKeyValue && !v.transferKeyKind) need('transferKeyKind', 'Con qué se identifica.')
  })
type Values = z.infer<typeof schema>

/**
 * De los campos planos al `paymentDetails` del contrato, o **`null` si no están
 * completos**.
 *
 * Mandar la mitad de una cuenta bancaria sería un 422: el contrato exige el juego
 * entero en cuanto hay `kind`. Y como los datos solo se exigen al publicar, media
 * cuenta a medio llenar es un estado normal, no un error que haya que gritar.
 */
function toPaymentDetails(v: Values): AccountPaymentDetails | null {
  if (v.accountType === 'BANK') {
    if (!v.bankName || !v.accountKind || !v.accountNumber || !v.holderName) return null
    return {
      kind: 'BANK',
      bankName: v.bankName,
      accountKind: v.accountKind,
      accountNumber: v.accountNumber,
      holderName: v.holderName,
      // Vacío es «no lo pongo», que en el contrato es `null`.
      holderDocument: v.holderDocument || null,
      transferKeyKind: v.transferKeyKind || null,
      transferKeyValue: v.transferKeyValue || null,
    }
  }
  if (v.accountType === 'DIGITAL_WALLET') {
    if (!v.provider || !v.phone) return null
    return { kind: 'WALLET', provider: v.provider, phone: v.phone, holderName: v.holderName || null }
  }
  // Una caja no tiene dónde consignar.
  return null
}

/** Y al revés, para poder editar lo guardado. */
function detailsToForm(details: FinancialAccount['paymentDetails']): Partial<Values> {
  if (!details) return {}
  if (details.kind === 'BANK') {
    return {
      bankName: details.bankName,
      accountKind: details.accountKind,
      accountNumber: details.accountNumber,
      holderName: details.holderName,
      holderDocument: details.holderDocument ?? '',
      transferKeyKind: details.transferKeyKind ?? '',
      transferKeyValue: details.transferKeyValue ?? '',
    }
  }
  return { provider: details.provider, phone: details.phone, holderName: details.holderName ?? '' }
}

function AccountDialog({
  orgId,
  open,
  onOpenChange,
  editing,
  branches,
  canPublish,
}: {
  orgId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: FinancialAccount | null
  branches: { id: string; name: string }[]
  /*
    `financial_accounts.publish` es **un permiso más** que el de crear cuentas, y
    solo lo piden estas dos cosas. Decide a qué número consignan los clientes y el
    deudor no puede notar un cambio, así que quien no lo tenga edita la cuenta
    igual pero no toca esto.
  */
  canPublish: boolean
}) {
  const create = useCreateFinancialAccount(orgId)
  const update = useUpdateFinancialAccount(orgId)
  const isEdit = !!editing
  const busy = create.isPending || update.isPending
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) })
  // El formulario cambia de campos al elegir el tipo: un banco pide número y
  // titular; una billetera, proveedor y celular; una caja, nada.
  const accountType = watch('accountType')
  const publishing = watch('publishInReminders')

  useEffect(() => {
    if (open)
      reset({
        name: editing?.name ?? '',
        accountType: editing?.accountType ?? 'CASH',
        currency: editing?.currency ?? 'COP',
        openingBalance: editing?.openingBalance ?? '',
        openingBalanceDate: editing?.openingBalanceDate ?? '',
        branchId: editing?.branchId ?? '',
        isActive: editing?.isActive ?? true,
        // **Publicar viene apagado.** Crear una cuenta ya no la publica: son dos
        // decisiones, y la segunda hay que pedirla.
        publishInReminders: editing?.publishInReminders ?? false,
        ...detailsToForm(editing?.paymentDetails ?? null),
      })
  }, [open, editing, reset])

  const onSubmit = handleSubmit(async (v) => {
    const base = {
      name: v.name,
      accountType: v.accountType,
      currency: v.currency ? v.currency.toUpperCase() : undefined,
      openingBalance: v.openingBalance || undefined,
      openingBalanceDate: v.openingBalanceDate || undefined,
      branchId: v.branchId ? v.branchId : null,
      paymentDetails: toPaymentDetails(v),
      publishInReminders: v.publishInReminders ?? false,
    }
    try {
      if (isEdit && editing) {
        await update.mutateAsync({ orgId, id: editing.id, data: { ...base, isActive: v.isActive } })
        toast.success('Cuenta actualizada')
      } else {
        await create.mutateAsync({ orgId, data: base })
        toast.success('Cuenta creada')
      }
      onOpenChange(false)
    } catch (err) {
      toastApiError(err, 'No se pudo guardar')
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Editar cuenta' : 'Nueva cuenta'}
      submitLabel={isEdit ? 'Guardar' : 'Crear'}
      loading={busy}
      onSubmit={onSubmit}
    >
      <Field label="Nombre" htmlFor="fa-name" required error={errors.name?.message}>
        <Input id="fa-name" placeholder="Caja general" {...register('name')} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tipo" htmlFor="fa-type" error={errors.accountType?.message}>
          <NativeSelect id="fa-type" {...register('accountType')}>
            {ACCOUNT_TYPES.map((t) => (
              <option key={t} value={t}>
                {ACCOUNT_TYPE_LABELS[t]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Moneda" htmlFor="fa-currency" hint="3 letras" error={errors.currency?.message}>
          <Input id="fa-currency" maxLength={3} placeholder="COP" {...register('currency')} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <MoneyField
          control={control}
          name="openingBalance"
          label="Saldo inicial"
          id="fa-balance"
          error={errors.openingBalance?.message}
          info="Saldo con el que arranca la cuenta. Después los saldos reales se calculan desde los movimientos."
        />
        <Field label="Fecha del saldo" htmlFor="fa-date" error={errors.openingBalanceDate?.message}>
          <Input id="fa-date" type="date" {...register('openingBalanceDate')} />
        </Field>
      </div>
      <Field label="Sede" htmlFor="fa-branch" error={errors.branchId?.message}>
        <NativeSelect id="fa-branch" {...register('branchId')}>
          <option value="">Sin sede</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      {/* ---------- Cómo le pagan a esta cuenta ---------- */}
      {accountType === 'BANK' && (
        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium">Datos para consignar</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Banco" htmlFor="fa-bank" error={errors.bankName?.message}>
              <Input id="fa-bank" placeholder="Bancolombia" {...register('bankName')} />
            </Field>
            <Field label="Tipo de cuenta" htmlFor="fa-kind" error={errors.accountKind?.message}>
              <NativeSelect id="fa-kind" {...register('accountKind')}>
                <option value="">Elige una</option>
                {BANK_ACCOUNT_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Field label="Número" htmlFor="fa-number" error={errors.accountNumber?.message}>
            <Input id="fa-number" placeholder="123-456789-00" {...register('accountNumber')} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="A nombre de" htmlFor="fa-holder" error={errors.holderName?.message}>
              <Input id="fa-holder" {...register('holderName')} />
            </Field>
            <Field
              label="Documento del titular"
              htmlFor="fa-doc"
              hint="Opcional"
              error={errors.holderDocument?.message}
            >
              <Input id="fa-doc" placeholder="NIT 900123456" {...register('holderDocument')} />
            </Field>
          </div>

          {/* La llave es un alias A esta cuenta, no otro destino: por eso son dos
              campos suyos y no una fila aparte. */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Llave de transferencia"
              htmlFor="fa-key-kind"
              hint="Opcional"
              error={errors.transferKeyKind?.message}
            >
              <NativeSelect id="fa-key-kind" {...register('transferKeyKind')}>
                <option value="">Sin llave</option>
                {TRANSFER_KEY_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Llave" htmlFor="fa-key" error={errors.transferKeyValue?.message}>
              <Input id="fa-key" placeholder="3105948908" {...register('transferKeyValue')} />
            </Field>
          </div>
        </div>
      )}

      {accountType === 'DIGITAL_WALLET' && (
        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium">Datos para transferir</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Billetera" htmlFor="fa-provider" error={errors.provider?.message}>
              <Input id="fa-provider" placeholder="Nequi" {...register('provider')} />
            </Field>
            <Field label="Celular" htmlFor="fa-phone" error={errors.phone?.message}>
              <Input id="fa-phone" inputMode="tel" {...register('phone')} />
            </Field>
          </div>
          <Field
            label="A nombre de"
            htmlFor="fa-wallet-holder"
            hint="Opcional"
            error={errors.holderName?.message}
          >
            <Input id="fa-wallet-holder" {...register('holderName')} />
          </Field>
        </div>
      )}

      <div className="space-y-2 border-t pt-4">
        <label
          className={cn(
            'flex items-start gap-2 text-sm',
            canPublish ? 'cursor-pointer' : 'opacity-60',
          )}
        >
          <input
            type="checkbox"
            className="accent-primary mt-0.5 size-4 shrink-0"
            disabled={!canPublish}
            {...register('publishInReminders')}
          />
          <span className="min-w-0">
            <span className="block">Enseñársela a quien te debe</span>
            <span className="text-muted-foreground block text-xs">
              Sale en los recordatorios de cobranza, dentro del renglón de «cómo pagar».
            </span>
          </span>
        </label>
        {errors.publishInReminders?.message && (
          <p className="text-destructive text-xs">{errors.publishInReminders.message}</p>
        )}
        {!canPublish && (
          <p className="text-muted-foreground text-xs">
            Tu rol no incluye publicar cuentas: decide a qué número consignan los clientes.
          </p>
        )}
        {/*
          `paymentPreview` es **el renglón exacto** que verá el deudor, compuesto
          por el servidor. Se pinta tal cual; armarlo aquí garantizaría que las dos
          versiones acaben diciendo cosas distintas.
        */}
        {publishing && editing?.paymentPreview && (
          <p className="bg-muted/40 text-muted-foreground rounded-md border px-3 py-2 text-xs">
            Hoy dice: <span className="text-foreground">{editing.paymentPreview}</span>
          </p>
        )}
      </div>

      {isEdit && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-primary" {...register('isActive')} />
          Activa
        </label>
      )}
    </FormDialog>
  )
}

/** Consulta este maestro; vive aquí porque el endpoint es de esta feature. */
function useFinancialAccountRows(params: MasterParams): ListResult<FinancialAccount> {
  const { orgId } = useCurrentOrg()
  return useFinancialAccounts(orgId, params)
}

export function FinancialAccountsPage() {
  const { orgId } = useCurrentOrg()
  const can = useCan()
  const canManage = can('financial_accounts.manage')
  const canPublish = can('financial_accounts.publish')
  const { branches } = useBranches(orgId)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<FinancialAccount | null>(null)

  const branchName = useMemo(() => {
    const map = new Map(branches.map((b) => [b.id, b.name]))
    return (id: string | null) => (id ? (map.get(id) ?? '—') : '—')
  }, [branches])

  /*
    Memorizada, y no por comodidad: «Sede» cierra sobre `branchName`, que cambia
    cuando llegan las sedes. `MasterCrud` memoriza las columnas por su identidad,
    así que una lista nueva en cada render la haría reconstruir la tabla entera —
    y una lista congelada dejaría «Sede» enseñando el «—» del primer render.
  */
  const columns: Column<FinancialAccount>[] = useMemo(
    () => [
      { header: 'Nombre', cell: (r) => r.name, card: 'title', sortField: 'name' },
      {
        header: 'Tipo',
        cell: (r) => ACCOUNT_TYPE_LABELS[r.accountType] ?? r.accountType,
        card: 'meta',
      },
      { header: 'Moneda', cell: (r) => r.currency, card: 'meta' },
      {
        header: 'Saldo inicial',
        cell: (r) => formatAmount(r.openingBalance, r.currency),
        align: 'right',
        card: 'amount',
      },
      {
        header: 'Sede',
        cell: (r) => <span className="text-muted-foreground">{branchName(r.branchId)}</span>,
      },
      {
        /*
          Qué cuentas ve el deudor, de un vistazo. Es lo que evita la pregunta de
          «¿por qué mi cliente consignó a la cuenta vieja?»: el renglón que sale
          en el mensaje es `paymentPreview`, compuesto por el servidor, y se pinta
          tal cual.
        */
        header: 'En los recordatorios',
        cell: (r) =>
          r.publishInReminders ? (
            <span className="text-muted-foreground text-xs">{r.paymentPreview ?? 'Publicada'}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
        card: 'meta',
      },
    ],
    [branchName],
  )

  return (
    <>
      <MasterCrud
        Icon={Wallet}
        title="Cuentas"
        description="Caja, bancos y billeteras. Los saldos reales se calculan desde los movimientos."
        canManage={canManage}
        newLabel="Nueva cuenta"
        searchPlaceholder="Buscar cuenta…"
        storageKey="nummo:cuentas-financieras:filtros"
        entity={['cuenta', 'cuentas']}
        useList={useFinancialAccountRows}
        columns={columns}
        onNew={() => {
          setEditing(null)
          setOpen(true)
        }}
        onEdit={(r) => {
          setEditing(r)
          setOpen(true)
        }}
      />
      {orgId && (
        <AccountDialog
          orgId={orgId}
          open={open}
          onOpenChange={setOpen}
          editing={editing}
          branches={branches}
          canPublish={canPublish}
        />
      )}
    </>
  )
}
