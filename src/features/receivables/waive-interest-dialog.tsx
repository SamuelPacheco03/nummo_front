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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { MoneyField } from '@/components/money-field'
import { Textarea } from '@/components/ui/textarea'
import { getErrorMessage } from '@/lib/errors'
import { formatAmount } from '@/lib/format'
import { useWaiveInterest } from './hooks'

const AMOUNT_RE = /^\d+(\.\d{1,2})?$/

const schema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, 'Obligatorio')
    .refine((v) => AMOUNT_RE.test(v), 'Monto inválido'),
  reason: z.string().trim().max(500).optional(),
})
type Values = z.infer<typeof schema>

export function WaiveInterestDialog({
  orgId,
  receivableId,
  interestTotal,
  currency,
  open,
  onOpenChange,
}: {
  orgId: string
  receivableId: string
  interestTotal: string
  currency?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const waive = useWaiveInterest(orgId)
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (open) reset({ amount: '', reason: '' })
  }, [open, reset])

  const onSubmit = handleSubmit(async (v) => {
    try {
      await waive.mutateAsync({
        orgId,
        id: receivableId,
        data: { amount: v.amount, reason: v.reason || null },
      })
      toast.success('Interés condonado')
      onOpenChange(false)
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo condonar'))
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Condonar interés</DialogTitle>
          <DialogDescription>
            Interés causado:{' '}
            <button
              type="button"
              className="nums font-medium text-foreground underline-offset-2 hover:underline"
              onClick={() => setValue('amount', String(Number(interestTotal)), { shouldValidate: true })}
            >
              {formatAmount(interestTotal, currency)}
            </button>{' '}
            (clic para usar el total). No puede exceder el interés pendiente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <MoneyField
            control={control}
            name="amount"
            label="Monto a condonar"
            id="wi-amount"
            required
            error={errors.amount?.message}
            info="Cuánto interés de mora perdonas. No puede superar el interés causado; clic en el monto de arriba para usar el total."
          />
          <Field label="Motivo" htmlFor="wi-reason" error={errors.reason?.message}>
            <Textarea id="wi-reason" rows={2} {...register('reason')} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={waive.isPending}>
              {waive.isPending && <Loader2 className="size-4 animate-spin" />}
              Condonar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
