import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { MoneyField } from '@/components/money-field'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { useBranches } from '@/features/config/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canManageOrg } from '@/features/organizations/roles'
import { getErrorMessage } from '@/lib/errors'
import { formatAmount } from '@/lib/format'
import type { FinancialAccount } from '@/api/generated/model'
import { MasterCrud, useMasterListState, type Column } from './master-crud'
import { ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS, isValidAmount } from './labels'
import { useCreateFinancialAccount, useFinancialAccounts, useUpdateFinancialAccount } from './hooks'

const schema = z.object({
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
})
type Values = z.infer<typeof schema>

function AccountDialog({
  orgId,
  open,
  onOpenChange,
  editing,
  branches,
}: {
  orgId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: FinancialAccount | null
  branches: { id: string; name: string }[]
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
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) })

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
      toast.error(getErrorMessage(err, 'No se pudo guardar'))
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar cuenta' : 'Nueva cuenta'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Nombre" htmlFor="fa-name" required error={errors.name?.message}>
            <Input id="fa-name" placeholder="Caja general" {...register('name')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
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
          <div className="grid grid-cols-2 gap-3">
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
          {isEdit && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-primary" {...register('isActive')} />
              Activa
            </label>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader size="sm" />}
              {isEdit ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function FinancialAccountsPage() {
  const { orgId, role } = useCurrentOrg()
  const canManage = canManageOrg(role)
  const state = useMasterListState()
  const list = useFinancialAccounts(orgId, state.params)
  const { branches } = useBranches(orgId)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<FinancialAccount | null>(null)

  const branchName = useMemo(() => {
    const map = new Map(branches.map((b) => [b.id, b.name]))
    return (id: string | null) => (id ? (map.get(id) ?? '—') : '—')
  }, [branches])

  const columns: Column<FinancialAccount>[] = [
    { header: 'Nombre', cell: (r) => r.name, className: 'font-medium' },
    { header: 'Tipo', cell: (r) => ACCOUNT_TYPE_LABELS[r.accountType] ?? r.accountType },
    { header: 'Moneda', cell: (r) => r.currency, className: 'nums' },
    {
      header: 'Saldo inicial',
      cell: (r) => formatAmount(r.openingBalance, r.currency),
      className: 'nums text-right',
      headClassName: 'text-right',
    },
    { header: 'Sede', cell: (r) => branchName(r.branchId), className: 'text-muted-foreground' },
  ]

  return (
    <>
      <MasterCrud
        title="Cuentas"
        description="Caja, bancos y billeteras. Los saldos reales se calculan desde los movimientos."
        canManage={canManage}
        newLabel="Nueva cuenta"
        searchPlaceholder="Buscar cuenta…"
        state={state}
        list={list}
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
        />
      )}
    </>
  )
}
