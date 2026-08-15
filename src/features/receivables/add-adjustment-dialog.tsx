import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { MoneyField } from '@/components/money-field'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { getErrorMessage } from '@/lib/errors'
import { ADJUSTMENT_TYPE_LABELS, CREATE_ADJUSTMENT_TYPES } from './labels'
import { useAddAdjustment } from './hooks'

const AMOUNT_RE = /^\d+(\.\d{1,2})?$/

const schema = z.object({
  adjustmentType: z.enum(['DISCOUNT', 'MANUAL_ADD', 'MANUAL_SUBTRACT']),
  amount: z
    .string()
    .trim()
    .min(1, 'Obligatorio')
    .refine((v) => AMOUNT_RE.test(v), 'Monto inválido'),
  reason: z.string().trim().max(500).optional(),
})
type Values = z.infer<typeof schema>

export function AddAdjustmentDialog({
  orgId,
  receivableId,
  open,
  onOpenChange,
}: {
  orgId: string
  receivableId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const add = useAddAdjustment(orgId)
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (open) reset({ adjustmentType: 'DISCOUNT', amount: '', reason: '' })
  }, [open, reset])

  const onSubmit = handleSubmit(async (v) => {
    try {
      await add.mutateAsync({
        orgId,
        id: receivableId,
        data: { adjustmentType: v.adjustmentType, amount: v.amount, reason: v.reason || null },
      })
      toast.success('Ajuste agregado')
      onOpenChange(false)
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo agregar el ajuste'))
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar ajuste</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Tipo" htmlFor="adj-type" error={errors.adjustmentType?.message}>
            <NativeSelect id="adj-type" {...register('adjustmentType')}>
              {CREATE_ADJUSTMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ADJUSTMENT_TYPE_LABELS[t]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <MoneyField
            control={control}
            name="amount"
            label="Monto"
            id="adj-amount"
            required
            error={errors.amount?.message}
            info="Escribe el monto en positivo. El signo lo define el tipo: descuento y resta bajan el saldo; suma lo aumenta."
          />
          <Field label="Motivo" htmlFor="adj-reason" error={errors.reason?.message}>
            <Textarea id="adj-reason" rows={2} {...register('reason')} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={add.isPending}>
              {add.isPending && <Loader2 className="size-4 animate-spin" />}
              Agregar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
