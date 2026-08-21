import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Field } from '@/components/ui/field'
import { FormDialog } from '@/components/ui/form-dialog'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Note } from '@/components/ui/note'
import { Textarea } from '@/components/ui/textarea'
import type { CreateWhatsAppTemplateInput } from '@/api/generated/model'
import { buildExamples, parseVariables } from './template-variables'

/**
 * **Crear una plantilla propia.**
 *
 * Dos cosas que la hacen distinta de un formulario cualquiera:
 *
 * **Los ejemplos se piden por variable, y las variables salen del texto.** Meta
 * necesita un valor de muestra por cada `{{marcador}}` para poder aprobar la
 * plantilla; escribir la lista aparte sería una segunda fuente de verdad que
 * discrepa del cuerpo en cuanto alguien edita una palabra. Así que los campos de
 * ejemplo aparecen y desaparecen con lo que se escribe arriba.
 *
 * **Sin botones.** `WhatsAppButtonSpec` existe en el contrato y es opcional; un
 * recordatorio de cobro no los usa, y un repetidor anidado de botones con su
 * tipo, su enlace y su número es una pantalla entera para algo que esta función
 * no necesita. Se añade el día que haga falta, no por completar el esquema.
 *
 * Valida con Zod: `FormDialog` monta su `<form>` con `noValidate`, así que un
 * `required` nativo no para nada y el 422 llegaría desde el API (§86.3).
 */
const schema = z.object({
  templateKey: z
    .string()
    .trim()
    .min(1, 'Hace falta una clave para nombrarla desde la política.')
    .max(80)
    .regex(/^[a-z0-9_]+$/, 'Solo minúsculas, números y guion bajo.'),
  name: z.string().trim().min(1, 'Meta necesita un nombre.').max(200),
  language: z.string().trim().min(1, 'Di en qué idioma está.').max(15),
  category: z.enum(['UTILITY', 'MARKETING', 'AUTHENTICATION']),
  header: z.string().trim().max(60).optional(),
  body: z.string().trim().min(1, 'Sin mensaje no hay plantilla.').max(1024),
  footer: z.string().trim().max(60).optional(),
})

type Values = z.infer<typeof schema>
export function TemplateFormDialog({
  open,
  onOpenChange,
  loading,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  loading: boolean
  onSubmit: (data: CreateWhatsAppTemplateInput) => Promise<void>
}) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { language: 'es', category: 'UTILITY' },
  })
  const [examples, setExamples] = useState<Record<string, string>>({})

  // Las variables salen del texto que se está escribiendo, así que hay que
  // mirarlo en vivo: `watch` es lo que hace que los campos de ejemplo aparezcan
  // y desaparezcan con los marcadores.
  const header = watch('header')
  const body = watch('body')
  const variables = useMemo(() => parseVariables(header, body), [header, body])

  const submit = handleSubmit((values) =>
    onSubmit({
      templateKey: values.templateKey,
      name: values.name,
      language: values.language,
      category: values.category,
      spec: {
        body: values.body,
        bodyExamples: buildExamples(values.body, examples),
        header: values.header || undefined,
        headerExamples: buildExamples(values.header, examples),
        footer: values.footer || undefined,
      },
    }),
  )

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Nueva plantilla"
      description="Meta tiene que aprobarla antes de que se pueda usar. Suele tardar unos minutos."
      submitLabel="Crear y enviar a revisión"
      loading={loading}
      onSubmit={submit}
    >
      <Field
        label="Clave"
        htmlFor="tpl-key"
        required
        error={errors.templateKey?.message}
        hint="Con la que la nombra la política de cobranza: cobro_recordatorio."
      >
        <Input id="tpl-key" maxLength={80} {...register('templateKey')} />
      </Field>

      <Field label="Nombre en Meta" htmlFor="tpl-name" required error={errors.name?.message}>
        <Input id="tpl-name" maxLength={200} {...register('name')} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Idioma" htmlFor="tpl-lang" required error={errors.language?.message}>
          <Input id="tpl-lang" maxLength={15} {...register('language')} />
        </Field>

        <Field
          label="Categoría"
          htmlFor="tpl-category"
          error={errors.category?.message}
          hint="La cobranza es de servicio, no publicidad."
        >
          <NativeSelect id="tpl-category" {...register('category')}>
            <option value="UTILITY">Servicio (recordatorios, avisos)</option>
            <option value="MARKETING">Publicidad</option>
            <option value="AUTHENTICATION">Autenticación</option>
          </NativeSelect>
        </Field>
      </div>

      <Field
        label="Encabezado"
        htmlFor="tpl-header"
        error={errors.header?.message}
        hint="Opcional, una línea corta."
      >
        <Input id="tpl-header" maxLength={60} {...register('header')} />
      </Field>

      <Field
        label="Mensaje"
        htmlFor="tpl-body"
        required
        error={errors.body?.message}
        hint="Usa {{nombre}} para los datos que cambian en cada envío."
      >
        <Textarea id="tpl-body" rows={5} maxLength={1024} {...register('body')} />
      </Field>

      <Field label="Pie" htmlFor="tpl-footer" error={errors.footer?.message} hint="Opcional.">
        <Input id="tpl-footer" maxLength={60} {...register('footer')} />
      </Field>

      {variables.length > 0 && (
        <div className="space-y-3 rounded-lg border p-3.5">
          <div>
            <p className="text-sm font-medium">Un ejemplo por dato que cambia</p>
            <p className="text-muted-foreground text-xs">
              Meta los pide para poder aprobar la plantilla. No se envían a nadie: solo le
              enseñan cómo queda el mensaje.
            </p>
          </div>
          {variables.map((variable) => (
            <Field key={variable} label={`{{${variable}}}`} htmlFor={`tpl-ex-${variable}`}>
              <Input
                id={`tpl-ex-${variable}`}
                value={examples[variable] ?? ''}
                onChange={(e) =>
                  setExamples((prev) => ({ ...prev, [variable]: e.target.value }))
                }
              />
            </Field>
          ))}
        </div>
      )}

      {/* No es un detalle: quien escriba «responde STOP» aquí estaría montando
          un opt-out que Nummo no ofrece a propósito (§11.1.16). */}
      <Note tone="info" title="No pidas que respondan">
        No hay bandeja de entrada: el canal recibe estados de entrega, no respuestas. Un
        mensaje que invite a contestar deja al cliente hablando solo.
      </Note>
    </FormDialog>
  )
}
