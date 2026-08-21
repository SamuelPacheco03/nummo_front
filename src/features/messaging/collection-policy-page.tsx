import { useState } from 'react'
import { Link } from 'react-router'
import { Lock } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Loader } from '@/components/ui/loader'
import { NativeSelect } from '@/components/ui/native-select'
import { Note } from '@/components/ui/note'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { toastApiError } from '@/features/platform/errors'
import { useCan, useFeature } from '@/features/platform/permissions'
import { cn } from '@/lib/utils'
import { useHydrateOnce } from '@/lib/use-hydrate-once'
import type { CollectionPolicy, WhatsAppTemplate } from '@/api/generated/model'
import { useCollectionPolicy, useUpdateCollectionPolicy, useWhatsAppTemplates } from './hooks'
import { describeQuietWindow } from './quiet-hours'

/**
 * **La política de cobranza por WhatsApp.**
 *
 * Nummo le escribe **al deudor** cuando su cuenta está por vencer o ya está en
 * mora. El deudor no tiene cuenta en Nummo: es un contacto con un teléfono, y
 * eso explica casi todo lo que hay aquí. No es un centro de notificaciones ni
 * unas preferencias de usuario; es una dirección, un consentimiento y una cola.
 *
 * Es la pantalla que **desbloquea el resto**: sin ella activada no hay mensajes
 * que listar en el historial.
 *
 * Se lee con `messaging.read` y se escribe con `messaging.settings.manage` más
 * la feature `whatsapp_outbound` — la única ruta del lote con feature, así que
 * la única que puede responder `FEATURE_NOT_AVAILABLE` (§45.5).
 */
export function CollectionPolicyPage() {
  const { orgId } = useCurrentOrg()
  const can = useCan()
  const canRead = can('messaging.read')
  const canManage = can('messaging.settings.manage')
  const hasFeature = useFeature('whatsapp_outbound')

  const { policy, isPending, isError, error, refetch } = useCollectionPolicy(
    canRead ? orgId : undefined,
  )
  // Las plantillas piden su propio permiso: quien no lo tenga ve la política
  // igual, con las claves guardadas en vez del desplegable.
  const { templates } = useWhatsAppTemplates(
    canRead && can('whatsapp.templates.read') ? orgId : undefined,
  )
  const save = useUpdateCollectionPolicy(orgId ?? '')

  const [enabled, setEnabled] = useState(false)
  const [quietStart, setQuietStart] = useState('22:00')
  const [quietEnd, setQuietEnd] = useState('07:00')
  const [dueSoon, setDueSoon] = useState('')
  const [overdue, setOverdue] = useState('')

  useHydrateOnce(orgId, policy, (current) => {
    setEnabled(current.enabled)
    setQuietStart(current.quietStart.slice(0, 5))
    setQuietEnd(current.quietEnd.slice(0, 5))
    setDueSoon(current.dueSoonTemplateKey ?? '')
    setOverdue(current.overdueTemplateKey ?? '')
  })

  if (!canRead) {
    return (
      <div className="space-y-4">
        <PageHeader title="Cobranza por WhatsApp" />
        <EmptyState
          Icon={Lock}
          title="No puedes ver esto"
          description="Tu rol no incluye los mensajes de cobranza de esta organización."
        />
      </div>
    )
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!orgId) return
    try {
      const saved = await save.mutateAsync({
        orgId,
        data: {
          enabled,
          quietStart,
          quietEnd,
          // Vacío es «sin plantilla», que apaga ese aviso. No es una cadena vacía.
          dueSoonTemplateKey: dueSoon || null,
          overdueTemplateKey: overdue || null,
        },
      })
      const data = saved.data as CollectionPolicy
      // La pantalla se queda, así que se vuelve a marcar limpia con **lo que
      // respondió el servidor** y no con el borrador (§45.7).
      setEnabled(data.enabled)
      setQuietStart(data.quietStart.slice(0, 5))
      setQuietEnd(data.quietEnd.slice(0, 5))
      setDueSoon(data.dueSoonTemplateKey ?? '')
      setOverdue(data.overdueTemplateKey ?? '')
      toast.success('Política guardada')
    } catch (err) {
      toastApiError(err, 'No se pudo guardar la política')
    }
  }

  const window = describeQuietWindow(quietStart, quietEnd)
  const writable = canManage && hasFeature

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cobranza por WhatsApp"
        description="Cuándo y con qué mensaje le escribe Nummo a quien te debe."
      />

      {isPending ? (
        <Skeleton className="h-96 w-full" />
      ) : isError ? (
        <ErrorState
          error={error}
          fallback="No se pudo cargar la política."
          onRetry={() => void refetch()}
        />
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {/* El plan es lo primero que hay que saber: sin la feature, todo lo de
              abajo se puede leer y nada se puede guardar (§45.5). */}
          {!hasFeature && (
            <Note tone="warning" title="Tu plan no incluye la cobranza por WhatsApp">
              Puedes revisar cómo está configurada, pero no guardar cambios.{' '}
              <Link to="/config/plan" className="text-brand underline">
                Ver planes
              </Link>
            </Note>
          )}

          <Card>
            <CardContent className="space-y-6">
              <label
                className={cn(
                  'flex items-start gap-3',
                  writable ? 'cursor-pointer' : 'opacity-60',
                )}
              >
                <input
                  type="checkbox"
                  className="accent-primary mt-0.5 size-4 shrink-0"
                  checked={enabled}
                  disabled={!writable}
                  onChange={(event) => setEnabled(event.target.checked)}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    Escribirle a quien debe, por WhatsApp
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    Nummo revisa los vencimientos y le manda el aviso al teléfono del deudor.
                    Apagado, no sale ningún mensaje.
                  </span>
                </span>
              </label>

              <div className="space-y-3 border-t pt-5">
                <div>
                  <p className="text-sm font-medium">Horas en las que no se molesta</p>
                  <p className="text-muted-foreground text-xs">
                    Un aviso que caiga dentro de la franja <strong>no se pierde: se aplaza</strong>{' '}
                    y sale en cuanto termina.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Desde" htmlFor="quiet-start">
                    <Input
                      id="quiet-start"
                      type="time"
                      className="w-40"
                      value={quietStart}
                      disabled={!writable}
                      onChange={(event) => setQuietStart(event.target.value)}
                    />
                  </Field>
                  <Field label="Hasta" htmlFor="quiet-end">
                    <Input
                      id="quiet-end"
                      type="time"
                      className="w-40"
                      value={quietEnd}
                      disabled={!writable}
                      onChange={(event) => setQuietEnd(event.target.value)}
                    />
                  </Field>
                </div>

                {/* Dos campos de hora sueltos no dicen que la franja cruza la
                    madrugada, y `22:00 → 07:00` es el caso normal. */}
                <p className="text-muted-foreground text-sm" aria-live="polite">
                  {window.text}
                  {window.duration && ` · ${window.duration}`}
                </p>
              </div>

              <div className="space-y-4 border-t pt-5">
                <div>
                  <p className="text-sm font-medium">Con qué mensaje</p>
                  <p className="text-muted-foreground text-xs">
                    Las plantillas las aprueba Meta antes de poder usarse.{' '}
                    <Link to="/config/plantillas" className="text-brand underline">
                      Ver plantillas
                    </Link>{' '}
                    ·{' '}
                    <Link to="/config/whatsapp" className="text-brand underline">
                      Desde qué número sale
                    </Link>
                  </p>
                </div>

                <TemplateField
                  id="due-soon"
                  label="Aviso de que está por vencer"
                  emptyWarning="Sin plantilla, no se avisa de lo que está por vencer."
                  templates={templates}
                  value={dueSoon}
                  disabled={!writable}
                  onChange={setDueSoon}
                />

                <TemplateField
                  id="overdue"
                  label="Aviso de que ya está vencido"
                  emptyWarning="Sin plantilla, no se avisa de la mora aunque la cobranza esté encendida."
                  templates={templates}
                  value={overdue}
                  disabled={!writable}
                  onChange={setOverdue}
                />
              </div>

              {/* Se configura una vez y en un sitio: los días de antelación ya
                  rigen los avisos internos y no se duplica el control aquí. */}
              <Note tone="info" title="Cuántos días antes se avisa se configura aparte">
                Sale de los días de antelación de la organización, que ya rigen los recordatorios
                internos.{' '}
                <Link to="/config/avisos" className="text-brand underline">
                  Política de avisos
                </Link>
              </Note>
            </CardContent>

            {writable && (
              <CardFooter className="justify-end gap-2">
                <Button type="submit" disabled={save.isPending}>
                  {save.isPending && <Loader className="size-4" />}
                  Guardar política
                </Button>
              </CardFooter>
            )}
          </Card>

          {policy?.updatedAt == null && (
            <p className="text-muted-foreground text-xs">
              Nadie ha tocado esta política todavía: lo que ves son los valores por defecto.
            </p>
          )}
        </form>
      )}
    </div>
  )
}

/**
 * Un desplegable de plantillas con **el hueco nombrado**.
 *
 * «Sin plantilla no hay aviso» es una regla del backend, no un detalle: con
 * `overdueTemplateKey` en `null` los vencidos no se avisan aunque `enabled` sea
 * `true`. Un `<select>` vacío no cuenta eso —se lee como «todavía no lo he
 * elegido»—, así que el estado se dice con palabras justo debajo.
 *
 * Y una plantilla que no puede enviar (`canSend: false`) se ofrece igual pero
 * marcada: es exactamente la que produce un `template_not_approved` en el
 * historial, y esconderla dejaría sin explicar por qué no llegó nada.
 */
function TemplateField({
  id,
  label,
  emptyWarning,
  templates,
  value,
  disabled,
  onChange,
}: {
  id: string
  label: string
  emptyWarning: string
  templates: WhatsAppTemplate[]
  value: string
  disabled: boolean
  onChange: (value: string) => void
}) {
  const chosen = templates.find((t) => t.templateKey === value)
  // La clave guardada puede no estar en el catálogo: una plantilla borrada, o el
  // permiso de leerlas que no se tiene. No se pierde el valor por eso.
  const unknown = value !== '' && templates.length > 0 && !chosen

  return (
    <Field label={label} htmlFor={id}>
      <NativeSelect
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Sin plantilla — no se envía este aviso</option>
        {unknown && <option value={value}>{value} (no está en el catálogo)</option>}
        {templates.map((template) => (
          <option key={template.templateKey} value={template.templateKey}>
            {template.name}
            {template.canSend ? '' : ' — todavía no se puede enviar'}
          </option>
        ))}
      </NativeSelect>

      {value === '' ? (
        <p className="text-warning-strong text-xs">{emptyWarning}</p>
      ) : chosen && !chosen.canSend ? (
        <p className="text-warning-strong text-xs">
          Meta todavía no la aprobó, así que este aviso no sale hasta que lo haga.
        </p>
      ) : chosen ? (
        <div className="flex items-center gap-2 text-xs">
          <StatusBadge tone="success" label="Lista para enviar" />
          {chosen.parameterNames.length > 0 && (
            <span className="text-muted-foreground">
              Usa: {chosen.parameterNames.join(', ')}
            </span>
          )}
        </div>
      ) : null}
    </Field>
  )
}
