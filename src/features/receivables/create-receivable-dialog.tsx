import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ContactPicker } from '@/components/contact-picker'
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
import { useBillingConcepts } from '@/features/masters/hooks'
import { getErrorMessage } from '@/lib/errors'
import { todayISODate } from '@/lib/format'
import { useCreateReceivable } from './hooks'

const AMOUNT_RE = /^\d+(\.\d{1,2})?$/

const schema = z.object({
  payerContactId: z.string().min(1, 'Selecciona el pagador'),
  billingConceptId: z.string().min(1, 'Selecciona el concepto'),
  dueDate: z.string().min(1, 'Obligatoria'),
  originalAmount: z
    .string()
    .trim()
    .min(1, 'Obligatorio')
    .refine((v) => AMOUNT_RE.test(v), 'Monto inválido'),
  currency: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || v.length === 3, '3 letras'),
  notes: z.string().trim().max(2000).optional(),
})
type Values = z.infer<typeof schema>

export function CreateReceivableDialog({
  orgId,
  open,
  onOpenChange,
}: {
  orgId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const create = useCreateReceivable(orgId)
  const { items: concepts } = useBillingConcepts(orgId, {
    page: 1,
    pageSize: 100,
    isActive: 'true',
    sort: 'name',
    order: 'asc',
  })

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (open)
      reset({
        payerContactId: '',
        billingConceptId: '',
        dueDate: todayISODate(),
        originalAmount: '',
        currency: 'COP',
        notes: '',
      })
  }, [open, reset])

  const payerId = watch('payerContactId')
  const conceptReg = register('billingConceptId')

  const onSubmit = handleSubmit(async (v) => {
    try {
      await create.mutateAsync({
        orgId,
        data: {
          payerContactId: v.payerContactId,
          billingConceptId: v.billingConceptId,
          dueDate: v.dueDate,
          originalAmount: v.originalAmount,
          currency: v.currency ? v.currency.toUpperCase() : undefined,
          notes: v.notes || null,
        },
      })
      toast.success('Cuenta por cobrar creada')
      onOpenChange(false)
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo crear'))
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva cuenta por cobrar</DialogTitle>
          <DialogDescription>Obligación manual (p.ej. matrícula), sin acuerdo recurrente.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Pagador" required error={errors.payerContactId?.message}>
            <ContactPicker
              orgId={orgId}
              value={payerId || null}
              onChange={(id) => setValue('payerContactId', id ?? '', { shouldValidate: true })}
              invalid={!!errors.payerContactId}
            />
          </Field>
          <Field label="Concepto" htmlFor="rc-concept" required error={errors.billingConceptId?.message}>
            <NativeSelect
              id="rc-concept"
              {...conceptReg}
              onChange={(e) => {
                void conceptReg.onChange(e)
                const c = concepts.find((x) => x.id === e.target.value)
                if (c?.defaultAmount && !getValues('originalAmount')) {
                  setValue('originalAmount', c.defaultAmount)
                }
              }}
            >
              <option value="">Selecciona…</option>
              {concepts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="grid grid-cols-[2fr_1fr] gap-3">
            <MoneyField
              control={control}
              name="originalAmount"
              label="Monto"
              id="rc-amount"
              required
              error={errors.originalAmount?.message}
              info="Valor total de la obligación. Escribe solo números: los miles se separan solos (p. ej. 1.465.775) y la coma es para decimales."
            />
            <Field label="Moneda" htmlFor="rc-currency" error={errors.currency?.message}>
              <Input id="rc-currency" maxLength={3} {...register('currency')} />
            </Field>
          </div>
          <Field label="Vence" htmlFor="rc-due" required error={errors.dueDate?.message}>
            <Input id="rc-due" type="date" {...register('dueDate')} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader size="sm" />}
              Crear
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
