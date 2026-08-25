import { useState } from 'react'
import { Link } from 'react-router'
import { Lock } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Loader } from '@/components/ui/loader'
import { NativeSelect } from '@/components/ui/native-select'
import { Note } from '@/components/ui/note'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { Switch } from '@/components/ui/switch'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { toastApiError } from '@/features/platform/errors'
import { useCan, useFeature } from '@/features/platform/permissions'
import { plural } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useHydrateOnce } from '@/lib/use-hydrate-once'
import type { CollectionPolicy } from '@/api/generated/model'
import { usePublishedAccounts } from '@/features/masters/hooks'
import { organizationContactRequired, scheduleFixedByLaw, sendTimeOutOfRange } from './errors'
import { LegalWeek } from './legal-week'
import { MessagePreview } from './message-preview'
import { OrgContactNote } from './org-contact-note'
import { StageTimeline, type Stage } from './stage-timeline'
import { TemplateField } from './template-field'
import { useCollectionPolicy, useUpdateCollectionPolicy, useWhatsAppTemplates } from './hooks'
import {
  describeSendableRange,
  describeStages,
  overdueEclipsesDueDate,
  sendableHours,
} from './schedule'
import { RunNowPanel } from './run-now-panel'

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
  const { orgId, organization } = useCurrentOrg()
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
  /*
    El recordatorio dice **dónde pagar**, y ese renglón lo arman las cuentas
    marcadas como publicadas. Sin ninguna, el mensaje no se queda en blanco —una
    variable vacía haría que Meta rechazara el envío entero— pero dice
    «comunícate con nosotros», y desde aquí no había forma de enterarse.
  */
  const { count: cuentasPublicadas, previews: renglonesDePago } = usePublishedAccounts(
    canRead && can('financial_accounts.read') ? orgId : undefined,
  )
  /*
    **Solo cuando se sabe que son cero.** `undefined` es «todavía no se sabe» —la
    consulta va en camino, o el rol no llega a las cuentas— y avisar ahí ponía el
    ámbar delante de una organización bien configurada: en el primer render,
    porque la política llega antes; y para siempre, a quien no puede ver cuentas y
    encima recibía un enlace a una pantalla que no puede abrir.
  */
  const sinFormasDePago = cuentasPublicadas === 0
  /*
    Sin teléfono ni correo de la empresa, **encender responde 422**: el mensaje
    tiene que decirle al deudor a dónde contestar, porque el número desde el que
    sale no recibe respuestas. Se mira sobre la casilla del borrador y no sobre la
    política guardada: es al encenderla cuando estorba, y avisar antes sería ruido
    en una pantalla que se está leyendo.
  */
  const sinContacto = Boolean(organization && !organization.contactPhone && !organization.contactEmail)

  const [enabled, setEnabled] = useState(false)
  const [sendAt, setSendAt] = useState('12:00')
  const [paymentLink, setPaymentLink] = useState('')
  /** Cuál de los cuatro avisos se está previsualizando. */
  const [verAviso, setVerAviso] = useState(0)
  /*
    Las tres etapas van con el interruptor separado del número porque **apagar no
    es poner cero**: `daysAfter: 0` significa avisar el mismo día del vencimiento
    —un aviso más, no uno menos—, y `null` es el que no manda nada. Con un solo
    campo numérico las dos cosas se escribirían igual.
  */
  const [before, setBefore] = useState<Stage>({ on: false, days: 3 })
  const [onDue, setOnDue] = useState(false)
  const [after, setAfter] = useState<Stage>({ on: false, days: 1 })
  const [dueSoon, setDueSoon] = useState('')
  const [dueSoonSummary, setDueSoonSummary] = useState('')
  const [overdue, setOverdue] = useState('')
  const [overdueSummary, setOverdueSummary] = useState('')

  useHydrateOnce(orgId, policy, (current) => {
    setEnabled(current.enabled)
    setSendAt(current.sendAt.slice(0, 5))
    setPaymentLink(current.paymentLink ?? '')
    setBefore({ on: current.daysBefore != null, days: current.daysBefore ?? 3 })
    setOnDue(current.remindOnDueDate)
    setAfter({ on: current.daysAfter != null, days: current.daysAfter ?? 1 })
    setDueSoon(current.dueSoonTemplateKey ?? '')
    setDueSoonSummary(current.dueSoonSummaryTemplateKey ?? '')
    setOverdue(current.overdueTemplateKey ?? '')
    setOverdueSummary(current.overdueSummaryTemplateKey ?? '')
  })

  if (!canRead) {
    return (
      <div className="space-y-4">
        <PageHeader title="Cobranza automática" />
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
    /*
      `https` y no `http`, y se comprueba aquí porque el contrato solo declara
      `format: uri`: este enlace le pide dinero a alguien, y mandarlo por un canal
      sin cifrar dentro de un mensaje de cobro es justo lo que enseña a los
      deudores a fiarse de un enlace cualquiera.
    */
    const enlace = paymentLink.trim()
    if (enlace && !/^https:\/\//i.test(enlace)) {
      toast.error('El enlace de pago tiene que empezar por https')
      return
    }
    try {
      const saved = await save.mutateAsync({
        orgId,
        data: {
          enabled,
          /*
            El horario **no viaja**: lo fija la Ley 2300 y el `PUT` lo rechaza
            entero con un 422 si aparece. Los campos siguen llegando en el `GET`
            —son la preferencia, que solo manda donde no hay horario legal— pero
            desde aquí no se mandan de vuelta.
          */
          sendAt,
          // Vacío es «no hay enlace», que en el contrato es `null`.
          paymentLink: enlace || null,
          // Apagada es `null`, y no cero: cero es una etapa encendida el día del
          // vencimiento.
          daysBefore: before.on ? before.days : null,
          remindOnDueDate: onDue,
          daysAfter: after.on ? after.days : null,
          // Vacío es «sin plantilla», que apaga ese aviso. No es una cadena vacía.
          dueSoonTemplateKey: dueSoon || null,
          dueSoonSummaryTemplateKey: dueSoonSummary || null,
          overdueTemplateKey: overdue || null,
          overdueSummaryTemplateKey: overdueSummary || null,
        },
      })
      const data = saved.data as CollectionPolicy
      // La pantalla se queda, así que se vuelve a marcar limpia con **lo que
      // respondió el servidor** y no con el borrador (§45.7).
      setEnabled(data.enabled)
      setSendAt(data.sendAt.slice(0, 5))
      setPaymentLink(data.paymentLink ?? '')
      setBefore({ on: data.daysBefore != null, days: data.daysBefore ?? 3 })
      setOnDue(data.remindOnDueDate)
      setAfter({ on: data.daysAfter != null, days: data.daysAfter ?? 1 })
      setDueSoon(data.dueSoonTemplateKey ?? '')
      setDueSoonSummary(data.dueSoonSummaryTemplateKey ?? '')
      setOverdue(data.overdueTemplateKey ?? '')
      setOverdueSummary(data.overdueSummaryTemplateKey ?? '')
      toast.success('Política guardada')
    } catch (err) {
      /*
        El rango sale del error y no está escrito aquí: es el backend quien sabe
        que el sábado cierra a las tres. Sin esto el usuario ve «datos inválidos»
        delante de un desplegable que le ofreció esa hora.
      */
      const fuera = sendTimeOutOfRange(err)
      if (fuera) {
        toast.error('Esa hora queda fuera del horario de cobranza', {
          description: `Tiene que valer todos los días de la semana: elige entre ${fuera.earliest} y ${fuera.latest}.`,
        })
        return
      }
      if (organizationContactRequired(err)) {
        toast.error('Falta decir a dónde te escribe quien te debe', {
          description:
            'Pon un teléfono o un correo de la empresa: va dentro del mensaje, porque el número desde el que sale no recibe respuestas.',
        })
        return
      }
      const porLey = scheduleFixedByLaw(err)
      if (porLey) {
        toast.error('El horario lo fija la ley y no se puede cambiar', {
          description: `${porLey.reference} — se rechazaron: ${porLey.fields.join(', ')}.`,
        })
        return
      }
      toastApiError(err, 'No se pudo guardar la política')
    }
  }

  const writable = canManage && hasFeature

  const horas = sendableHours(policy?.schedule.sendableRange ?? null, sendAt)
  const rangoLegible = describeSendableRange(policy?.schedule.sendableRange ?? null)
  // Sale de la respuesta y no escrito aquí: no es un tope que el backend
  // comprueba, es que no existen más etapas.
  const topeDeAvisos = policy?.schedule.maxRemindersPerReceivable ?? 3
  const etapasActuales = {
    daysBefore: before.on ? before.days : null,
    remindOnDueDate: onDue,
    daysAfter: after.on ? after.days : null,
  }
  const etapas = describeStages(etapasActuales)
  const tapaElDiaQueVence = overdueEclipsesDueDate(etapasActuales)

  const plantillaDe = (key: string) => templates.find((t) => t.templateKey === key)
  /*
    Los cuatro avisos, cada uno con su plantilla y cuándo sale. La vista previa
    mira este mismo arreglo, así que no hay forma de que enseñe una cosa y el
    formulario guarde otra.
  */
  const AVISOS = [
    { id: 'due-soon', chip: 'Por vencer · una', key: dueSoon, etapa: 'antes' },
    { id: 'due-soon-summary', chip: 'Por vencer · varias', key: dueSoonSummary, etapa: 'antes' },
    { id: 'overdue', chip: 'Vencida · una', key: overdue, etapa: 'despues' },
    { id: 'overdue-summary', chip: 'Vencida · varias', key: overdueSummary, etapa: 'despues' },
  ] as const
  const avisoVisto = AVISOS[verAviso] ?? AVISOS[0]
  const cuandoSale =
    avisoVisto.etapa === 'antes'
      ? before.on
        ? `Sale ${plural(before.days, 'día', 'días')} antes del vencimiento, a las ${sendAt}.`
        : 'Esa etapa está apagada: hoy no sale.'
      : after.on
        ? after.days === 0
          ? `Sale el mismo día del vencimiento, a las ${sendAt}.`
          : `Sale ${plural(after.days, 'día', 'días')} después del vencimiento, a las ${sendAt}.`
        : 'Esa etapa está apagada: hoy no sale.'

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cobranza automática"
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
          {enabled && sinContacto && (
            <OrgContactNote orgId={orgId} canManageOrg={can('organization.manage')} />
          )}

          {policy?.enabled && sinFormasDePago && (
            <Note tone="warning" title="Los recordatorios no dicen dónde pagar">
              Ninguna cuenta está publicada, así que el mensaje dice «Para pagar: comunícate
              con nosotros».{' '}
              <Link to="/maestros/cuentas" className="text-brand underline">
                Publicar una cuenta
              </Link>
            </Note>
          )}

          {!hasFeature && (
            <Note tone="warning" title="Tu plan no incluye la cobranza por WhatsApp">
              Puedes revisar cómo está configurada, pero no guardar cambios.{' '}
              <Link to="/config/plan" className="text-brand underline">
                Ver planes
              </Link>
            </Note>
          )}

          {/*
            Dos columnas en escritorio y la vista previa pegada arriba: se mira
            mientras se toca lo de al lado, que es justo lo que la hace útil.
          */}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
            <div className="space-y-4">
              {/* ---------- El interruptor, y lo que está pasando ---------- */}
              <Card>
                <CardContent className="flex flex-wrap items-center gap-4 sm:flex-nowrap">
                  <label
                    className={cn(
                      'flex min-w-0 flex-1 items-center gap-4',
                      writable ? 'cursor-pointer' : 'opacity-60',
                    )}
                  >
                    <Switch checked={enabled} disabled={!writable} onCheckedChange={setEnabled} />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <span className="font-medium">Cobranza automática</span>
                        <StatusBadge
                          tone={enabled ? 'success' : 'muted'}
                          label={enabled ? 'Encendida' : 'Apagada'}
                        />
                      </span>
                      <span className="text-muted-foreground mt-0.5 block text-xs">
                        {enabled
                          ? 'Nummo revisa los vencimientos y le manda el aviso al teléfono del deudor.'
                          : 'Puedes dejarlo todo listo aquí; no sale ningún mensaje hasta que la enciendas.'}
                      </span>
                    </span>
                  </label>

                  {/* Lo que hay que saber sin leer nada más: cuántas veces y a qué hora. */}
                  <dl className="flex gap-6 border-t pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
                    <div>
                      <dd className="nums text-xl font-semibold">{etapas.count}</dd>
                      <dt className="text-muted-foreground text-xs">
                        de {topeDeAvisos} avisos por cuenta
                      </dt>
                    </div>
                    <div>
                      <dd className="nums text-xl font-semibold">{sendAt}</dd>
                      <dt className="text-muted-foreground text-xs">hora de envío</dt>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              {/* Solo con la política **guardada** como activa: apagada, el endpoint
                  responde 409 y el botón no tendría sentido. */}
              {policy?.enabled && <RunNowPanel orgId={orgId} canRun={can('messaging.send')} />}

              {/*
                Apagada se atenúa pero **se sigue pudiendo tocar**: lo normal es
                dejarlo configurado y encenderlo al final, y bloquearlo obligaría a
                encender la cobranza para poder prepararla.
              */}
              <div className={cn('space-y-4 transition-opacity', !enabled && 'opacity-75')}>
                {/* ---------- Cuándo se le escribe ---------- */}
                <Card>
                  <CardContent className="space-y-4">
                    <div className="flex items-baseline justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">Cuándo se le escribe</p>
                        <p className="text-muted-foreground text-xs">
                          Cada cuenta pasa por estas etapas <strong>una sola vez</strong>. Si no
                          te pagan, <strong>Nummo no vuelve a insistir</strong> por esa cuenta.
                        </p>
                      </div>
                      <span className="text-muted-foreground shrink-0 text-xs">
                        máximo {topeDeAvisos}
                      </span>
                    </div>

                    <StageTimeline
                      before={before}
                      onDue={onDue}
                      after={after}
                      disabled={!writable}
                      onBefore={setBefore}
                      onOnDue={setOnDue}
                      onAfter={setAfter}
                    />

                    {tapaElDiaQueVence && (
                      <Note tone="info" title="«El día que vence» no va a salir">
                        Con el aviso de mora a los 0 días, los dos caen el mismo día y{' '}
                        <strong>gana el de mora</strong>. Ponlo a 1 día o más si quieres los dos.
                      </Note>
                    )}

                    <p className="text-muted-foreground text-sm" aria-live="polite">
                      {etapas.count === 0 ? (
                        <>
                          Ahora mismo <strong>no se le escribe nunca</strong>: no hay ninguna
                          etapa encendida.
                        </>
                      ) : (
                        <>
                          Se le escribe <strong>{plural(etapas.count, 'vez', 'veces')}</strong>:{' '}
                          {listar(etapas.parts)}.
                        </>
                      )}
                    </p>
                  </CardContent>
                </Card>

                {/* ---------- A qué hora, y el horario que fija la ley ---------- */}
                <Card>
                  <CardContent className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-start">
                    <Field
                      label="A qué hora salen"
                      htmlFor="send-at"
                      hint={
                        rangoLegible
                          ? `Solo entre ${rangoLegible}. Un aviso que caiga fuera no se pierde: se aplaza.`
                          : 'Un aviso que caiga fuera del horario no se pierde: se aplaza.'
                      }
                    >
                      <NativeSelect
                        id="send-at"
                        value={sendAt}
                        disabled={!writable}
                        onChange={(event) => setSendAt(event.target.value)}
                      >
                        {horas.map((hora) => (
                          <option key={hora} value={hora}>
                            {hora}
                          </option>
                        ))}
                      </NativeSelect>
                    </Field>
                    {policy && <LegalWeek schedule={policy.schedule} />}
                  </CardContent>
                </Card>

                {/* ---------- Con qué mensaje ---------- */}
                <Card>
                  <CardContent className="space-y-4">
                    <div className="flex items-baseline justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">Qué dice el mensaje</p>
                        {/*
                          Cuatro y no dos: un deudor recibe **un solo aviso** con todo
                          lo que debe, y como Meta no pluraliza cada momento necesita
                          su singular y su plural — con una sola saldría «tienes 1
                          facturas vencidas».
                        */}
                        <p className="text-muted-foreground text-xs">
                          A quien debe varias cuentas se le escribe <strong>una sola vez</strong>{' '}
                          con el total. Por eso cada momento lleva dos plantillas: Meta no
                          pluraliza, y con una sola saldría «tienes 1 facturas vencidas».
                        </p>
                      </div>
                      <Link to="/config/plantillas" className="text-brand shrink-0 text-sm underline">
                        Ver plantillas
                      </Link>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <TemplateField
                        id="due-soon"
                        label="Por vencer, cuando es una sola cuenta"
                        emptyWarning="Sin plantilla, no se avisa de lo que está por vencer."
                        templates={templates}
                        value={dueSoon}
                        disabled={!writable}
                        onChange={setDueSoon}
                        onFocus={() => setVerAviso(0)}
                      />
                      <TemplateField
                        id="due-soon-summary"
                        label="Por vencer, cuando son varias"
                        /* Vacía **no es un error**: cae a la singular con el total, y no
                           miente porque su texto dice «saldo pendiente», no «tu factura». */
                        emptyWarning="Sin plantilla se usa la de arriba, con el total pero sin decir cuántas cuentas son."
                        emptyTone="muted"
                        templates={templates}
                        value={dueSoonSummary}
                        disabled={!writable}
                        onChange={setDueSoonSummary}
                        onFocus={() => setVerAviso(1)}
                      />
                      <TemplateField
                        id="overdue"
                        label="Vencida, cuando es una sola cuenta"
                        emptyWarning="Sin plantilla, no se avisa de la mora aunque la cobranza esté encendida."
                        templates={templates}
                        value={overdue}
                        disabled={!writable}
                        onChange={setOverdue}
                        onFocus={() => setVerAviso(2)}
                      />
                      <TemplateField
                        id="overdue-summary"
                        label="Vencida, cuando son varias"
                        emptyWarning="Sin plantilla se usa la de arriba, con el total pero sin decir cuántas facturas son."
                        emptyTone="muted"
                        templates={templates}
                        value={overdueSummary}
                        disabled={!writable}
                        onChange={setOverdueSummary}
                        onFocus={() => setVerAviso(3)}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* ---------- Dónde puede pagar ---------- */}
                <Card>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium">Dónde puede pagar</p>
                      <p className="text-muted-foreground text-xs">
                        El renglón de «cómo pagar» del mensaje lo arman{' '}
                        <Link to="/maestros/cuentas" className="text-brand underline">
                          las cuentas que marques como publicadas
                        </Link>
                        . Aquí solo va el enlace, si tienes uno.
                      </p>
                    </div>
                    {/*
                      El enlace **no es una cuenta**: el dinero no vive en una URL. Por
                      eso es uno solo y vive en la política, en vez de competir con las
                      cuentas por un sitio en la lista.
                    */}
                    <Field
                      label="Enlace de pago"
                      htmlFor="payment-link"
                      hint="Opcional. Tiene que empezar por https."
                    >
                      <Input
                        id="payment-link"
                        type="url"
                        inputMode="url"
                        placeholder="https://…"
                        maxLength={300}
                        value={paymentLink}
                        disabled={!writable}
                        onChange={(event) => setPaymentLink(event.target.value)}
                      />
                    </Field>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* ---------- La vista previa ---------- */}
            <div className="space-y-2 lg:sticky lg:top-4">
              <div role="tablist" aria-label="Qué aviso se está viendo" className="flex flex-wrap gap-1.5">
                {AVISOS.map((aviso, i) => (
                  <button
                    key={aviso.id}
                    type="button"
                    role="tab"
                    aria-selected={i === verAviso}
                    onClick={() => setVerAviso(i)}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-xs transition-colors',
                      i === verAviso
                        ? 'bg-primary text-primary-foreground border-transparent font-medium'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {aviso.chip}
                  </button>
                ))}
              </div>
              <MessagePreview
                template={plantillaDe(avisoVisto.key)}
                paymentLines={renglonesDePago}
                paymentLink={paymentLink.trim()}
                contact={{
                  phone: organization?.contactPhone ?? null,
                  email: organization?.contactEmail ?? null,
                }}
                when={cuandoSale}
              />
            </div>
          </div>

          {policy?.updatedAt == null && (
            <p className="text-muted-foreground text-xs">
              Nadie ha tocado esta política todavía: lo que ves son los valores por defecto.
            </p>
          )}

          {/*
            Pegada abajo: la pantalla es larga y en un teléfono el botón acababa al
            final de un desplazamiento entero, después de cuatro tarjetas.
          */}
          {writable && (
            <div className="bg-background/90 sticky bottom-0 -mx-4 flex justify-end border-t px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-b-lg sm:px-0">
              <Button type="submit" disabled={save.isPending} className="w-full sm:w-auto">
                {save.isPending && <Loader className="size-4" />}
                Guardar política
              </Button>
            </div>
          )}
        </form>
      )}
    </div>
  )
}

/** «3 días antes, el día que vence y 1 día después» — una lista en castellano. */
function listar(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? ''
  return `${parts.slice(0, -1).join(', ')} y ${parts.at(-1)}`
}
