import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Field } from '@/components/ui/field'
import { FormDialog } from '@/components/ui/form-dialog'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Note } from '@/components/ui/note'
import type { CreatePaymentInstruction, PaymentInstruction } from '@/api/generated/model'
import { ACCOUNT_KINDS, INSTRUCTION_KINDS, KEY_KINDS, instructionKind } from './payment-instruction-labels'

/**
 * **Dar de alta o corregir una forma de pago.**
 *
 * `details` es una unión discriminada por `kind`, así que el formulario **cambia
 * de campos al elegir el tipo**. Se valida con Zod y no con el `required` nativo:
 * `FormDialog` monta su `<form>` con `noValidate` (§86.3).
 *
 * **Ningún campo es un `textarea`, y no es un descuido.** Estos textos acaban
 * dentro de un parámetro de plantilla de WhatsApp, y Meta rechaza el envío entero
 * si lleva saltos de línea. El backend los normaliza al entrar, pero ofrecer una
 * caja de varias líneas invita a escribir algo que no cabe.
 */
const schema = z
  .object({
    kind: z.enum(['BANK_ACCOUNT', 'TRANSFER_KEY', 'WALLET', 'PAYMENT_LINK', 'OTHER']),
    label: z.string().trim().max(120).optional(),
    // Los campos de las cinco variantes viven juntos y se validan por `kind`:
    // un esquema discriminado obligaría a remontar el formulario al cambiar de
    // tipo, y con él se perdería lo ya escrito.
    bankName: z.string().trim().max(60).optional(),
    accountKind: z.enum(['SAVINGS', 'CHECKING']).or(z.literal('')).optional(),
    accountNumber: z.string().trim().max(40).optional(),
    holderName: z.string().trim().max(120).optional(),
    holderDocument: z.string().trim().max(40).optional(),
    keyKind: z.enum(['PHONE', 'EMAIL', 'DOCUMENT', 'ALPHANUMERIC']).or(z.literal('')).optional(),
    keyValue: z.string().trim().max(120).optional(),
    provider: z.string().trim().max(40).optional(),
    phone: z.string().trim().max(25).optional(),
    // Solo `https`: este enlace le pide dinero a alguien, y el backend responde
    // 422 con `http`.
    url: z.string().trim().max(300).optional(),
    text: z.string().trim().max(160).optional(),
  })
  .superRefine((v, ctx) => {
    const need = (campo: keyof typeof v, mensaje: string) => {
      if (!v[campo]) ctx.addIssue({ code: 'custom', path: [campo], message: mensaje })
    }
    if (v.kind === 'BANK_ACCOUNT') {
      need('bankName', 'De qué banco es.')
      need('accountKind', 'Ahorros o corriente: consignar a la que no es rebota.')
      need('accountNumber', 'Sin el número no se puede consignar.')
      need('holderName', 'A nombre de quién está.')
    }
    if (v.kind === 'TRANSFER_KEY') {
      need('keyKind', 'Con qué se identifica la llave.')
      need('keyValue', 'La llave en sí.')
    }
    if (v.kind === 'WALLET') {
      need('provider', 'Nequi, Daviplata…')
      need('phone', 'El celular al que se le manda.')
    }
    if (v.kind === 'PAYMENT_LINK') {
      if (!v.url) need('url', 'La dirección del enlace.')
      else if (!/^https:\/\//i.test(v.url)) {
        ctx.addIssue({
          code: 'custom',
          path: ['url'],
          message: 'Tiene que empezar por https: este enlace le pide dinero a alguien.',
        })
      }
    }
    if (v.kind === 'OTHER') need('text', 'Qué hay que decirle al deudor.')
  })

type Values = z.infer<typeof schema>

/** De los campos planos del formulario al `details` que espera el contrato. */
function toDetails(v: Values): CreatePaymentInstruction['details'] {
  switch (v.kind) {
    case 'BANK_ACCOUNT':
      return {
        kind: 'BANK_ACCOUNT',
        bankName: v.bankName!,
        accountKind: v.accountKind as 'SAVINGS' | 'CHECKING',
        accountNumber: v.accountNumber!,
        holderName: v.holderName!,
        // Vacío es «no lo pongo», que en el contrato es `null`.
        holderDocument: v.holderDocument || null,
      }
    case 'TRANSFER_KEY':
      return {
        kind: 'TRANSFER_KEY',
        bankName: v.bankName || null,
        keyKind: v.keyKind as 'PHONE' | 'EMAIL' | 'DOCUMENT' | 'ALPHANUMERIC',
        keyValue: v.keyValue!,
      }
    case 'WALLET':
      return { kind: 'WALLET', provider: v.provider!, phone: v.phone! }
    case 'PAYMENT_LINK':
      return { kind: 'PAYMENT_LINK', url: v.url! }
    case 'OTHER':
      return { kind: 'OTHER', text: v.text! }
  }
}

/** Y al revés, para poder editar lo guardado. */
function toForm(instruction: PaymentInstruction): Partial<Values> {
  const d = instruction.details as Record<string, unknown>
  return {
    kind: instruction.kind,
    label: instruction.label ?? '',
    bankName: (d.bankName as string) ?? '',
    accountKind: (d.accountKind as Values['accountKind']) ?? '',
    accountNumber: (d.accountNumber as string) ?? '',
    holderName: (d.holderName as string) ?? '',
    holderDocument: (d.holderDocument as string) ?? '',
    keyKind: (d.keyKind as Values['keyKind']) ?? '',
    keyValue: (d.keyValue as string) ?? '',
    provider: (d.provider as string) ?? '',
    phone: (d.phone as string) ?? '',
    url: (d.url as string) ?? '',
    text: (d.text as string) ?? '',
  }
}

export function PaymentInstructionDialog({
  open,
  onOpenChange,
  editing,
  loading,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** La que se corrige, o `null` para dar una de alta. */
  editing: PaymentInstruction | null
  loading: boolean
  onSubmit: (data: { label: string | null; details: CreatePaymentInstruction['details'] }) => Promise<void>
}) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: editing ? toForm(editing) : { kind: 'BANK_ACCOUNT' },
  })

  const kind = watch('kind')

  const submit = handleSubmit((values) =>
    onSubmit({ label: values.label || null, details: toDetails(values) }),
  )

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? 'Corregir forma de pago' : 'Nueva forma de pago'}
      description="Es lo que el recordatorio le dice al deudor sobre dónde pagar."
      submitLabel={editing ? 'Guardar' : 'Añadir'}
      loading={loading}
      onSubmit={submit}
    >
      <Field label="Tipo" htmlFor="pi-kind" error={errors.kind?.message}>
        <NativeSelect id="pi-kind" {...register('kind')}>
          {INSTRUCTION_KINDS.map((k) => (
            <option key={k} value={k}>
              {instructionKind(k).label}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <Field
        label="Nombre para reconocerla"
        htmlFor="pi-label"
        error={errors.label?.message}
        hint="Solo para ti: «La principal», «La de nómina». No sale en el mensaje."
      >
        <Input id="pi-label" maxLength={120} {...register('label')} />
      </Field>

      {kind === 'BANK_ACCOUNT' && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Banco" htmlFor="pi-bank" required error={errors.bankName?.message}>
              <Input id="pi-bank" maxLength={60} {...register('bankName')} />
            </Field>
            <Field
              label="Tipo de cuenta"
              htmlFor="pi-account-kind"
              required
              error={errors.accountKind?.message}
            >
              <NativeSelect id="pi-account-kind" {...register('accountKind')}>
                <option value="">Elige una</option>
                {ACCOUNT_KINDS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Field label="Número" htmlFor="pi-number" required error={errors.accountNumber?.message}>
            <Input id="pi-number" maxLength={40} {...register('accountNumber')} />
          </Field>
          <Field label="A nombre de" htmlFor="pi-holder" required error={errors.holderName?.message}>
            <Input id="pi-holder" maxLength={120} {...register('holderName')} />
          </Field>
          <Field
            label="Cédula o NIT"
            htmlFor="pi-doc"
            error={errors.holderDocument?.message}
            hint="Opcional, pero el banco lo pide para confirmar a quién se le consigna."
          >
            <Input id="pi-doc" maxLength={40} {...register('holderDocument')} />
          </Field>
        </>
      )}

      {kind === 'TRANSFER_KEY' && (
        <>
          <Field label="Banco" htmlFor="pi-key-bank" error={errors.bankName?.message} hint="Opcional.">
            <Input id="pi-key-bank" maxLength={60} {...register('bankName')} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo de llave" htmlFor="pi-key-kind" required error={errors.keyKind?.message}>
              <NativeSelect id="pi-key-kind" {...register('keyKind')}>
                <option value="">Elige uno</option>
                {KEY_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Llave" htmlFor="pi-key" required error={errors.keyValue?.message}>
              <Input id="pi-key" maxLength={120} {...register('keyValue')} />
            </Field>
          </div>
        </>
      )}

      {kind === 'WALLET' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Billetera" htmlFor="pi-provider" required error={errors.provider?.message}>
            <Input id="pi-provider" maxLength={40} placeholder="Nequi" {...register('provider')} />
          </Field>
          <Field label="Celular" htmlFor="pi-phone" required error={errors.phone?.message}>
            <Input id="pi-phone" maxLength={25} {...register('phone')} />
          </Field>
        </div>
      )}

      {kind === 'PAYMENT_LINK' && (
        <Field
          label="Dirección"
          htmlFor="pi-url"
          required
          error={errors.url?.message}
          hint="Tiene que ser https."
        >
          <Input id="pi-url" maxLength={300} placeholder="https://" {...register('url')} />
        </Field>
      )}

      {kind === 'OTHER' && (
        <Field
          label="Qué decirle al deudor"
          htmlFor="pi-text"
          required
          error={errors.text?.message}
          hint="Una línea: acaba dentro del mensaje de WhatsApp."
        >
          <Input id="pi-text" maxLength={160} {...register('text')} />
        </Field>
      )}

      <Note tone="info" title="Esto lo va a leer quien te debe">
        Sale tal cual dentro del recordatorio, así que conviene que se entienda sin contexto.
      </Note>
    </FormDialog>
  )
}
