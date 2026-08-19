import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ContactPicker } from '@/components/contact-picker'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { DetailDrawer } from '@/components/ui/detail-drawer'
import { Field } from '@/components/ui/field'
import { MoneyField } from '@/components/money-field'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { useExpenseCategories } from '@/features/masters/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { toastApiError } from '@/features/platform/errors'
import { todayISODate } from '@/lib/format'
import type { ExpenseSchedule } from '@/api/generated/model'
import { useCreateSchedule, useExpenseSchedule, useUpdateSchedule } from './hooks'

const AMOUNT_RE = /^\d+(\.\d{1,2})?$/

/** El botón de guardar vive en el pie del cajón, fuera del <form>. */
const FORM_ID = 'schedule-form'

const schema = z.object({
  supplierContactId: z.string().min(1, 'Selecciona el proveedor'),
  expenseCategoryId: z.string().min(1, 'Selecciona la categoría'),
  name: z.string().trim().max(160).optional(),
  agreedAmount: z
    .string()
    .trim()
    .min(1, 'Obligatorio')
    .refine((v) => AMOUNT_RE.test(v), 'Monto inválido'),
  currency: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || v.length === 3, '3 letras'),
  startDate: z.string().min(1, 'Obligatoria'),
  endDate: z.string().optional(),
  dueDay: z.number().int().min(1, 'Día 1–31').max(31, 'Día 1–31'),
  generateDaysBefore: z.number().int().min(0).max(60),
  notes: z.string().trim().max(2000).optional(),
})
type Values = z.infer<typeof schema>

function toForm(s: ExpenseSchedule): Values {
  return {
    supplierContactId: s.supplierContactId,
    expenseCategoryId: s.expenseCategoryId,
    name: s.name ?? '',
    agreedAmount: s.agreedAmount,
    currency: s.currency,
    startDate: s.startDate,
    endDate: s.endDate ?? '',
    dueDay: s.dueDay,
    generateDaysBefore: s.generateDaysBefore,
    notes: s.notes ?? '',
  }
}

export function ScheduleFormPage() {
  const { scheduleId } = useParams()
  const isEdit = !!scheduleId
  const navigate = useNavigate()
  const { orgId } = useCurrentOrg()
  const oid = orgId ?? ''

  const { schedule, isPending: loading } = useExpenseSchedule(orgId, scheduleId)
  const create = useCreateSchedule(oid)
  const update = useUpdateSchedule(oid)
  const { items: categories } = useExpenseCategories(orgId, { page: 1, pageSize: 100, isActive: 'true', sort: 'name', order: 'asc' })

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      supplierContactId: '',
      expenseCategoryId: '',
      name: '',
      agreedAmount: '',
      currency: 'COP',
      startDate: todayISODate(),
      endDate: '',
      dueDay: 1,
      generateDaysBefore: 0,
      notes: '',
    },
  })

  useEffect(() => {
    if (isEdit && schedule) reset(toForm(schedule))
  }, [isEdit, schedule, reset])

  const supplierId = watch('supplierContactId')
  const busy = create.isPending || update.isPending
  const backTo = isEdit && scheduleId ? `/gastos/recurrentes/${scheduleId}` : '/gastos/recurrentes'

  const onSubmit = handleSubmit(async (v) => {
    const data = {
      supplierContactId: v.supplierContactId,
      expenseCategoryId: v.expenseCategoryId,
      name: v.name || null,
      agreedAmount: v.agreedAmount,
      currency: v.currency ? v.currency.toUpperCase() : undefined,
      startDate: v.startDate,
      endDate: v.endDate || null,
      dueDay: v.dueDay,
      generateDaysBefore: v.generateDaysBefore,
      notes: v.notes || null,
    }
    try {
      if (isEdit && scheduleId) {
        await update.mutateAsync({ orgId: oid, id: scheduleId, data })
        toast.success('Recurrente actualizado')
        navigate(`/gastos/recurrentes/${scheduleId}`)
      } else {
        const res = await create.mutateAsync({ orgId: oid, data })
        const created = res.data as ExpenseSchedule
        toast.success('Recurrente creado')
        navigate(`/gastos/recurrentes/${created.id}`)
      }
    } catch (err) {
      toastApiError(err, 'No se pudo guardar')
    }
  })

  return (
    <DetailDrawer
      closeTo={backTo}
      title={isEdit ? 'Editar gasto recurrente' : 'Nuevo gasto recurrente'}
      loading={isEdit && loading}
      footer={
        // Fuera del <form>, así que se ata por id para poder enviarlo igual.
        <Button type="submit" form={FORM_ID} disabled={busy} className="w-full">
          {busy && <Loader size="sm" />}
          {isEdit ? 'Guardar cambios' : 'Crear'}
        </Button>
      }
    >
      <form id={FORM_ID} onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Proveedor" required error={errors.supplierContactId?.message}>
            <ContactPicker
              label={'Proveedor'}
              orgId={oid}
              value={supplierId || null}
              onChange={(id) => setValue('supplierContactId', id ?? '', { shouldValidate: true })}
              invalid={!!errors.supplierContactId}
            />
          </Field>
          <Field label="Categoría" htmlFor="s-cat" required error={errors.expenseCategoryId?.message}>
            <NativeSelect id="s-cat" {...register('expenseCategoryId')}>
              <option value="">Selecciona…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <MoneyField
            control={control}
            name="agreedAmount"
            label="Monto acordado"
            id="s-amount"
            required
            error={errors.agreedAmount?.message}
            info="Valor de cada cuenta por pagar que se generará automáticamente por este gasto recurrente."
          />
          <Field label="Moneda" htmlFor="s-currency" error={errors.currency?.message}>
            <Input id="s-currency" maxLength={3} {...register('currency')} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Inicio" htmlFor="s-start" required error={errors.startDate?.message}>
            <Input id="s-start" type="date" {...register('startDate')} />
          </Field>
          <Field label="Fin" htmlFor="s-end" hint="Opcional" error={errors.endDate?.message}>
            <Input id="s-end" type="date" {...register('endDate')} />
          </Field>
          <Field
            label="Día de pago"
            htmlFor="s-dueday"
            required
            info="Día del mes (1–31) en que vence cada cuota."
            error={errors.dueDay?.message}
          >
            <Input id="s-dueday" className="nums" type="number" min={1} max={31} {...register('dueDay', { valueAsNumber: true })} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Generar días antes"
            htmlFor="s-genbefore"
            hint="0–60"
            info="Cuántos días antes del vencimiento se crea sola la cuenta por pagar del mes. 0 = el mismo día."
            error={errors.generateDaysBefore?.message}
          >
            <Input id="s-genbefore" className="nums" type="number" min={0} max={60} {...register('generateDaysBefore', { valueAsNumber: true })} />
          </Field>
          <Field label="Nombre / referencia" htmlFor="s-name" hint="Opcional">
            <Input id="s-name" {...register('name')} />
          </Field>
        </div>

        <Field label="Notas" htmlFor="s-notes">
          <Textarea id="s-notes" rows={2} {...register('notes')} />
        </Field>
      </form>
    </DetailDrawer>
  )
}
