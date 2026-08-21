import { useMemo, useState } from 'react'
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
 */
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
  const [templateKey, setTemplateKey] = useState('')
  const [name, setName] = useState('')
  const [language, setLanguage] = useState('es')
  const [category, setCategory] =
    useState<CreateWhatsAppTemplateInput['category']>('UTILITY')
  const [header, setHeader] = useState('')
  const [body, setBody] = useState('')
  const [footer, setFooter] = useState('')
  const [examples, setExamples] = useState<Record<string, string>>({})

  const variables = useMemo(() => parseVariables(header, body), [header, body])

  // Se monta solo mientras está abierto: el estado de partida lo ponen los
  // inicializadores y no hace falta efecto (§45.7).
  if (!open) return null

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Nueva plantilla"
      description="Meta tiene que aprobarla antes de que se pueda usar. Suele tardar unos minutos."
      submitLabel="Crear y enviar a revisión"
      loading={loading}
      onSubmit={(event) => {
        event.preventDefault()
        void onSubmit({
          templateKey: templateKey.trim(),
          name: name.trim(),
          language: language.trim(),
          category,
          spec: {
            body: body.trim(),
            bodyExamples: buildExamples(body, examples),
            header: header.trim() || undefined,
            headerExamples: buildExamples(header, examples),
            footer: footer.trim() || undefined,
          },
        })
      }}
    >
      <Field
        label="Clave"
        htmlFor="tpl-key"
        required
        hint="Con la que la nombra la política de cobranza. Sin espacios: cobro_recordatorio."
      >
        <Input
          id="tpl-key"
          value={templateKey}
          required
          maxLength={80}
          onChange={(e) => setTemplateKey(e.target.value)}
        />
      </Field>

      <Field label="Nombre en Meta" htmlFor="tpl-name" required>
        <Input
          id="tpl-name"
          value={name}
          required
          maxLength={200}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Idioma" htmlFor="tpl-lang" required>
          <Input
            id="tpl-lang"
            value={language}
            required
            maxLength={15}
            onChange={(e) => setLanguage(e.target.value)}
          />
        </Field>

        <Field
          label="Categoría"
          htmlFor="tpl-category"
          hint="La cobranza es de servicio, no publicidad."
        >
          <NativeSelect
            id="tpl-category"
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as CreateWhatsAppTemplateInput['category'])
            }
          >
            <option value="UTILITY">Servicio (recordatorios, avisos)</option>
            <option value="MARKETING">Publicidad</option>
            <option value="AUTHENTICATION">Autenticación</option>
          </NativeSelect>
        </Field>
      </div>

      <Field label="Encabezado" htmlFor="tpl-header" hint="Opcional, una línea corta.">
        <Input
          id="tpl-header"
          value={header}
          maxLength={60}
          onChange={(e) => setHeader(e.target.value)}
        />
      </Field>

      <Field
        label="Mensaje"
        htmlFor="tpl-body"
        required
        hint="Usa {{nombre}} para los datos que cambian en cada envío."
      >
        <Textarea
          id="tpl-body"
          value={body}
          required
          rows={5}
          maxLength={1024}
          onChange={(e) => setBody(e.target.value)}
        />
      </Field>

      <Field label="Pie" htmlFor="tpl-footer" hint="Opcional.">
        <Input
          id="tpl-footer"
          value={footer}
          maxLength={60}
          onChange={(e) => setFooter(e.target.value)}
        />
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
