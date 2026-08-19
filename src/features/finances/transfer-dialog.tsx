import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { MoneyField } from '@/components/money-field'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { toastApiError } from '@/features/platform/errors'
import { useIdempotencyKey } from '@/lib/idempotency'
import { useCreateTransfer } from './hooks'

const AMOUNT_RE = /^\d+(\.\d{1,2})?$/

const schema = z
  .object({
    fromAccountId: z.string().min(1, 'Selecciona la cuenta origen'),
    toAccountId: z.string().min(1, 'Selecciona la cuenta destino'),
    amount: z
      .string()
      .trim()
      .min(1, 'Obligatorio')
      .refine((v) => AMOUNT_RE.test(v), 'Monto inválido'),
    reference: z.string().trim().max(120).optional(),
  })
  .refine((d) => d.fromAccountId !== d.toAccountId, {
    path: ['toAccountId'],
    message: 'Debe ser distinta a la origen',
  })
type Values = z.infer<typeof schema>

export function TransferDialog({
  orgId,
  accounts,
  open,
  onOpenChange,
}: {
  orgId: string
  accounts: { id: string; name: string }[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const idem = useIdempotencyKey()
  const transfer = useCreateTransfer(orgId, idem.key)
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (open) reset({ fromAccountId: '', toAccountId: '', amount: '', reference: '' })
  }, [open, reset])

  const onSubmit = handleSubmit(async (v) => {
    try {
      await transfer.mutateAsync({
        orgId,
        data: {
          fromAccountId: v.fromAccountId,
          toAccountId: v.toAccountId,
          amount: v.amount,
          reference: v.reference || undefined,
        },
      })
      toast.success('Transferencia registrada')
      idem.renew()
      onOpenChange(false)
    } catch (err) {
      toastApiError(err, 'No se pudo transferir')
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transferir entre cuentas</DialogTitle>
          <DialogDescription>Mueve dinero entre cuentas sin afectar el ingreso/egreso neto.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Desde" htmlFor="t-from" required error={errors.fromAccountId?.message}>
            <NativeSelect id="t-from" {...register('fromAccountId')}>
              <option value="">Selecciona…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Hacia" htmlFor="t-to" required error={errors.toAccountId?.message}>
            <NativeSelect id="t-to" {...register('toAccountId')}>
              <option value="">Selecciona…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <MoneyField
              control={control}
              name="amount"
              label="Monto"
              id="t-amount"
              required
              error={errors.amount?.message}
              info="Cuánto mueves de una cuenta a otra. No cambia tu ingreso/egreso neto: solo traslada saldo."
            />
            <Field label="Referencia" htmlFor="t-ref" error={errors.reference?.message}>
              <Input id="t-ref" {...register('reference')} />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={transfer.isPending}>
              {transfer.isPending && <Loader size="sm" />}
              Transferir
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
