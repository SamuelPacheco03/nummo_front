import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { ContactPicker } from '@/components/contact-picker'
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
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { useExpenseCategories } from '@/features/masters/hooks'
import { getErrorMessage } from '@/lib/errors'
import { todayISODate } from '@/lib/format'
import { useCreateExpense } from './hooks'

const AMOUNT_RE = /^\d+(\.\d{1,2})?$/

const schema = z.object({
  supplierContactId: z.string().min(1, 'Selecciona el proveedor'),
  expenseCategoryId: z.string().min(1, 'Selecciona la categoría'),
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
})
type Values = z.infer<typeof schema>

export function CreateExpenseDialog({
  orgId,
  open,
  onOpenChange,
}: {
  orgId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const create = useCreateExpense(orgId)
  const { items: categories } = useExpenseCategories(orgId, {
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
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (open)
      reset({
        supplierContactId: '',
        expenseCategoryId: '',
        dueDate: todayISODate(),
        originalAmount: '',
        currency: 'COP',
      })
  }, [open, reset])

  const supplierId = watch('supplierContactId')

  const onSubmit = handleSubmit(async (v) => {
    try {
      await create.mutateAsync({
        orgId,
        data: {
          supplierContactId: v.supplierContactId,
          expenseCategoryId: v.expenseCategoryId,
          dueDate: v.dueDate,
          originalAmount: v.originalAmount,
          currency: v.currency ? v.currency.toUpperCase() : undefined,
        },
      })
      toast.success('Gasto creado')
      onOpenChange(false)
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo crear'))
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo gasto</DialogTitle>
          <DialogDescription>Obligación manual con un proveedor, sin gasto recurrente.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Proveedor" required error={errors.supplierContactId?.message}>
            <ContactPicker
              orgId={orgId}
              value={supplierId || null}
              onChange={(id) => setValue('supplierContactId', id ?? '', { shouldValidate: true })}
              invalid={!!errors.supplierContactId}
            />
          </Field>
          <Field label="Categoría" htmlFor="ex-cat" required error={errors.expenseCategoryId?.message}>
            <NativeSelect id="ex-cat" {...register('expenseCategoryId')}>
              <option value="">Selecciona…</option>
              {categories.map((c) => (
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
              id="ex-amount"
              required
              error={errors.originalAmount?.message}
              info="Valor total del gasto. Escribe solo números: los miles se separan solos (p. ej. 1.200.000)."
            />
            <Field label="Moneda" htmlFor="ex-currency" error={errors.currency?.message}>
              <Input id="ex-currency" maxLength={3} {...register('currency')} />
            </Field>
          </div>
          <Field label="Vence" htmlFor="ex-due" required error={errors.dueDate?.message}>
            <Input id="ex-due" type="date" {...register('dueDate')} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2 className="size-4 animate-spin" />}
              Crear
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
