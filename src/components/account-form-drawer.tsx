import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ContactPicker } from '@/components/contact-picker'
import { MoneyField } from '@/components/money-field'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Loader } from '@/components/ui/loader'
import { NativeSelect } from '@/components/ui/native-select'
import { todayISODate } from '@/lib/format'

const AMOUNT_RE = /^\d+(\.\d{1,2})?$/

const schema = z.object({
  contactId: z.string().min(1),
  catalogId: z.string().min(1),
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
export type AccountFormValues = z.infer<typeof schema>

/** Lo que cambia entre cobrar y pagar: las palabras. */
export interface AccountFormCopy {
  title: string
  description: string
  /** «Pagador» / «Proveedor». */
  contact: string
  contactMissing: string
  /** «Concepto» / «Categoría». */
  catalog: string
  catalogMissing: string
  amountInfo: string
}

/** Una opción del catálogo. `defaultAmount` solo lo traen los conceptos de cobro. */
export interface CatalogOption {
  id: string
  name: string
  defaultAmount?: string | null
}

/** El botón de crear vive en el pie del cajón, fuera del `<form>`. */
const FORM_ID = 'account-form'

/**
 * **Una cuenta nueva a mano**, de cobro o de pago.
 *
 * Es el mismo formulario para las dos caras —contacto, catálogo, monto,
 * vencimiento— y por eso es **un** componente: eran dos archivos casi calcados
 * que solo se diferenciaban en media docena de palabras y el endpoint, con el
 * riesgo de siempre (§«nada por duplicado»: se arregla uno y se olvida el otro).
 * Lo que cambia de verdad viaja en `copy` y en `onSubmit`.
 *
 * Sale del `Drawer` de la app (§11.1.3) y no de un diálogo centrado: el
 * centrado es de Configuración, donde se ajusta algo de una vez. Esto es
 * trabajo diario sobre una lista, y va donde va todo lo que se abre «de lado».
 */
export function AccountFormDrawer({
  orgId,
  open,
  onOpenChange,
  idPrefix,
  copy,
  catalog,
  isSubmitting,
  onSubmit,
}: {
  orgId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Prefijo de los `id` de los campos, para que no choquen si conviven dos. */
  idPrefix: string
  copy: AccountFormCopy
  catalog: CatalogOption[]
  isSubmitting: boolean
  onSubmit: (values: AccountFormValues) => Promise<void>
}) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<AccountFormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (open)
      reset({
        contactId: '',
        catalogId: '',
        dueDate: todayISODate(),
        originalAmount: '',
        currency: 'COP',
      })
  }, [open, reset])

  const contactId = watch('contactId')
  const catalogReg = register('catalogId')

  const submit = handleSubmit((values) => onSubmit(values))

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={copy.title}
      meta={copy.description}
      // Cinco campos: en móvil la hoja llega hasta donde llegue el formulario.
      // A pantalla completa dejaba media en blanco y parecía que faltaba algo
      // por cargar.
      fit
      footer={
        // Fuera del <form>, así que se ata por id para poder enviarlo igual.
        <Button type="submit" form={FORM_ID} disabled={isSubmitting} className="w-full">
          {isSubmitting && <Loader size="sm" />}
          Crear
        </Button>
      }
    >
      <form id={FORM_ID} onSubmit={submit} noValidate className="space-y-4">
        <Field
          label={copy.contact}
          required
          error={errors.contactId && copy.contactMissing}
        >
          <ContactPicker
            orgId={orgId}
            value={contactId || null}
            onChange={(id) => setValue('contactId', id ?? '', { shouldValidate: true })}
            invalid={!!errors.contactId}
          />
        </Field>

        <Field
          label={copy.catalog}
          htmlFor={`${idPrefix}-catalog`}
          required
          error={errors.catalogId && copy.catalogMissing}
        >
          <NativeSelect
            id={`${idPrefix}-catalog`}
            {...catalogReg}
            onChange={(e) => {
              void catalogReg.onChange(e)
              // Si el catálogo trae importe sugerido —los conceptos de cobro lo
              // traen— se siembra, pero nunca pisa lo que ya escribió alguien.
              const option = catalog.find((x) => x.id === e.target.value)
              if (option?.defaultAmount && !getValues('originalAmount')) {
                setValue('originalAmount', option.defaultAmount)
              }
            }}
          >
            <option value="">Selecciona…</option>
            {catalog.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <div className="grid grid-cols-[2fr_1fr] gap-3">
          <MoneyField
            control={control}
            name="originalAmount"
            label="Monto"
            id={`${idPrefix}-amount`}
            required
            error={errors.originalAmount?.message}
            info={copy.amountInfo}
          />
          <Field label="Moneda" htmlFor={`${idPrefix}-currency`} error={errors.currency?.message}>
            <Input id={`${idPrefix}-currency`} maxLength={3} {...register('currency')} />
          </Field>
        </div>

        <Field label="Vence" htmlFor={`${idPrefix}-due`} required error={errors.dueDate?.message}>
          <Input id={`${idPrefix}-due`} type="date" {...register('dueDate')} />
        </Field>
      </form>
    </Drawer>
  )
}
