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
import { plural } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useHydrateOnce } from '@/lib/use-hydrate-once'
import type {
  CollectionPolicy,
  CollectionPolicySchedule,
  WhatsAppTemplate,
} from '@/api/generated/model'
import { useFinancialAccounts } from '@/features/masters/hooks'
import { scheduleFixedByLaw, sendTimeOutOfRange } from './errors'
import { paymentAwareUpgrade, saysWherePay } from './labels'
import { useCollectionPolicy, useUpdateCollectionPolicy, useWhatsAppTemplates } from './hooks'
import {
  describeSendableRange,
  describeStages,
  groupWeek,
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
  /*
    El recordatorio dice **dónde pagar**, y ese renglón lo arman las cuentas
    marcadas como publicadas. Sin ninguna, el mensaje no se queda en blanco —una
    variable vacía haría que Meta rechazara el envío entero— pero dice
    «comunícate con nosotros», y desde aquí no había forma de enterarse.
  */
  const { items: cuentas } = useFinancialAccounts(
    canRead && can('financial_accounts.read') ? orgId : undefined,
    { page: 1, pageSize: 100 },
  )
  const sinFormasDePago = cuentas.every((c) => !c.publishInReminders)

  const [enabled, setEnabled] = useState(false)
  const [sendAt, setSendAt] = useState('12:00')
  const [paymentLink, setPaymentLink] = useState('')
  /*
    Las tres etapas van con el interruptor separado del número porque **apagar no
    es poner cero**: `daysAfter: 0` significa avisar el mismo día del vencimiento
    —un aviso más, no uno menos—, y `null` es el que no manda nada. Con un solo
    campo numérico las dos cosas se escribirían igual.
  */
  const [beforeOn, setBeforeOn] = useState(false)
  const [beforeDays, setBeforeDays] = useState('3')
  const [onDue, setOnDue] = useState(false)
  const [afterOn, setAfterOn] = useState(false)
  const [afterDays, setAfterDays] = useState('1')
  const [dueSoon, setDueSoon] = useState('')
  const [dueSoonSummary, setDueSoonSummary] = useState('')
  const [overdue, setOverdue] = useState('')
  const [overdueSummary, setOverdueSummary] = useState('')

  useHydrateOnce(orgId, policy, (current) => {
    setEnabled(current.enabled)
    setSendAt(current.sendAt.slice(0, 5))
    setPaymentLink(current.paymentLink ?? '')
    setBeforeOn(current.daysBefore != null)
    if (current.daysBefore != null) setBeforeDays(String(current.daysBefore))
    setOnDue(current.remindOnDueDate)
    setAfterOn(current.daysAfter != null)
    if (current.daysAfter != null) setAfterDays(String(current.daysAfter))
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
    if (paymentLink && !/^https:\/\//i.test(paymentLink)) {
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
          paymentLink: paymentLink.trim() || null,
          // Apagada es `null`, y no cero: cero es una etapa encendida el día del
          // vencimiento.
          daysBefore: beforeOn ? Number(beforeDays) : null,
          remindOnDueDate: onDue,
          daysAfter: afterOn ? Number(afterDays) : null,
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
      setBeforeOn(data.daysBefore != null)
      if (data.daysBefore != null) setBeforeDays(String(data.daysBefore))
      setOnDue(data.remindOnDueDate)
      setAfterOn(data.daysAfter != null)
      if (data.daysAfter != null) setAfterDays(String(data.daysAfter))
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
    daysBefore: beforeOn ? Number(beforeDays) : null,
    remindOnDueDate: onDue,
    daysAfter: afterOn ? Number(afterDays) : null,
  }
  const etapas = describeStages(etapasActuales)
  const tapaElDiaQueVence = overdueEclipsesDueDate(etapasActuales)

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
          {/*
            Solo con la política **guardada** como activa, no con la casilla del
            borrador: apagada, el endpoint responde 409 y el botón no tendría
            sentido. Pide `messaging.send`, que es otro permiso que el de guardar.
          */}
          {policy?.enabled && <RunNowPanel orgId={orgId} canRun={can('messaging.send')} />}

          {/* Solo con la cobranza encendida: apagada no hay mensaje que salga
              mal, y el aviso sería ruido. */}
          {policy?.enabled && sinFormasDePago && (
            <Note tone="warning" title="Los recordatorios no dicen dónde pagar">
              Ninguna cuenta está publicada, así que el mensaje dice «Para pagar: comunícate
              con nosotros».{' '}
              <Link to="/maestros/cuentas" className="text-brand underline">
                Publicar una cuenta
              </Link>
            </Note>
          )}

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

              {/* ---------- Cuándo se le escribe ---------- */}
              <div className="space-y-4 border-t pt-5">
                <div>
                  <p className="text-sm font-medium">Cuándo se le puede escribir</p>
                  <p className="text-muted-foreground text-xs">
                    {policy?.schedule.legalReference ? (
                      <>
                        Lo fija la ley, no tú: <strong>{policy.schedule.legalReference}</strong>. Un
                        aviso que caiga fuera <strong>no se pierde: se aplaza</strong>.
                      </>
                    ) : (
                      <>
                        El horario de contacto de tu país. Un aviso que caiga fuera{' '}
                        <strong>no se pierde: se aplaza</strong>.
                      </>
                    )}
                  </p>
                </div>

                {policy && <LegalWeek schedule={policy.schedule} />}

                <Field
                  label="A qué hora salen"
                  htmlFor="send-at"
                  hint={
                    rangoLegible
                      ? `Tiene que valer todos los días, así que solo se puede entre ${rangoLegible}.`
                      : undefined
                  }
                >
                  <NativeSelect
                    id="send-at"
                    className="w-40"
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
              </div>

              {/* ---------- Dónde puede pagar ---------- */}
              <div className="space-y-4 border-t pt-5">
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
              </div>

              {/* ---------- Cuántas veces ---------- */}
              <div className="space-y-4 border-t pt-5">
                <div>
                  <p className="text-sm font-medium">Cuántas veces se le escribe</p>
                  {/*
                    Lo que nadie va a suponer y hay que decir en la pantalla: antes
                    el aviso de mora salía **cada día** mientras la deuda existiera.
                    Ahora cada etapa dispara una sola vez en toda la vida de la
                    cuenta, así que a quien no paga Nummo deja de escribirle.
                  */}
                  <p className="text-muted-foreground text-xs">
                    Como mucho <strong>{topeDeAvisos} avisos por cuenta de cobro</strong>, y cada
                    uno <strong>una sola vez</strong>. Si no te pagan,{' '}
                    <strong>Nummo no vuelve a insistir</strong> por esa cuenta.
                  </p>
                </div>

                <StageField
                  id="before"
                  label="Antes de que venza"
                  unit="días antes"
                  min={1}
                  checked={beforeOn}
                  value={beforeDays}
                  disabled={!writable}
                  onToggle={setBeforeOn}
                  onValue={setBeforeDays}
                />

                <label
                  className={cn('flex items-start gap-3', writable ? 'cursor-pointer' : 'opacity-60')}
                >
                  <input
                    type="checkbox"
                    className="accent-primary mt-0.5 size-4 shrink-0"
                    checked={onDue}
                    disabled={!writable}
                    onChange={(event) => setOnDue(event.target.checked)}
                  />
                  <span className="block text-sm">El día que vence</span>
                </label>

                <StageField
                  id="after"
                  label="Cuando ya esté vencida"
                  unit="días después"
                  /* Cero es válido y significa el mismo día del vencimiento. */
                  min={0}
                  checked={afterOn}
                  value={afterDays}
                  disabled={!writable}
                  onToggle={setAfterOn}
                  onValue={setAfterDays}
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
                      Ahora mismo <strong>no se le escribe nunca</strong>: no hay ninguna etapa
                      encendida.
                    </>
                  ) : (
                    <>
                      Se le escribe <strong>{plural(etapas.count, 'vez', 'veces')}</strong>:{' '}
                      {listar(etapas.parts)}.
                    </>
                  )}
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

                {/*
                  Cuatro plantillas y no dos, y la pantalla tiene que explicar por
                  qué: **un deudor recibe un solo aviso** con todo lo que debe, no
                  uno por factura. Cada momento va con su singular y su plural
                  porque Meta no pluraliza — con una sola saldría «tienes 1
                  facturas vencidas».
                */}
                <p className="text-muted-foreground text-xs">
                  A quien debe varias facturas se le escribe <strong>una sola vez</strong>, con el
                  total. Por eso cada momento lleva dos plantillas: Meta no pluraliza, y con una
                  sola saldría «tienes 1 facturas vencidas».
                </p>

                <TemplateField
                  id="due-soon"
                  label="Por vencer, cuando es una sola cuenta"
                  emptyWarning="Sin plantilla, no se avisa de lo que está por vencer."
                  templates={templates}
                  value={dueSoon}
                  disabled={!writable}
                  onChange={setDueSoon}
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
                />

                <TemplateField
                  id="overdue"
                  label="Vencida, cuando es una sola cuenta"
                  emptyWarning="Sin plantilla, no se avisa de la mora aunque la cobranza esté encendida."
                  templates={templates}
                  value={overdue}
                  disabled={!writable}
                  onChange={setOverdue}
                />

                <TemplateField
                  id="overdue-summary"
                  label="Vencida, cuando son varias"
                  /* Vacía **no es un error**: se cae a la singular con el total.
                     Lo que se pierde es el conteo, y eso sí hay que decirlo. */
                  emptyWarning="Sin plantilla se usa la de arriba, con el total pero sin decir cuántas facturas son."
                  emptyTone="muted"
                  templates={templates}
                  value={overdueSummary}
                  disabled={!writable}
                  onChange={setOverdueSummary}
                />
              </div>

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

/** «3 días antes, el día que vence y 1 día después» — una lista en castellano. */
function listar(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? ''
  return `${parts.slice(0, -1).join(', ')} y ${parts.at(-1)}`
}

/**
 * **La semana como información, no como controles.**
 *
 * Donde hay ley que fija el horario de cobranza —en Colombia la 2300— esto no es
 * una preferencia y no se puede editar ni para ampliarlo ni para recortarlo. Aun
 * así se enseña en vez de esconderse: es lo que explica por qué un recordatorio
 * no salió el domingo, y esconderlo dejaría esa pregunta sin respuesta en la
 * pantalla que la provoca.
 *
 * El domingo llega como `null` y se dice con palabras. Pintarlo como una franja
 * vacía —«de 00:00 a 00:00»— diría que se escribe a medianoche.
 */
function LegalWeek({ schedule }: { schedule: CollectionPolicySchedule }) {
  return (
    <dl className="bg-muted/40 divide-border divide-y rounded-lg border text-sm">
      {groupWeek(schedule.week).map(({ label, window }) => (
        <div key={label} className="flex items-baseline justify-between gap-3 px-3 py-2">
          <dt className="text-muted-foreground min-w-0">{label}</dt>
          <dd className={cn('shrink-0', window ? 'nums font-medium' : 'text-muted-foreground')}>
            {window ? `${window.start} – ${window.end}` : 'No se contacta'}
          </dd>
        </div>
      ))}
      {schedule.excludesHolidays && (
        <div className="text-muted-foreground px-3 py-2 text-xs">
          Los festivos tampoco: se toman del país de la organización.
        </div>
      )}
    </dl>
  )
}

/**
 * Una etapa de aviso: **el interruptor y el número van separados a propósito.**
 *
 * Apagar no es poner cero. `daysAfter: 0` significa avisar el mismo día del
 * vencimiento —un aviso más, no uno menos— y `null` es el que no manda nada. Con
 * un solo campo numérico las dos cosas se escribirían igual y no habría forma de
 * apagar la etapa sin adelantarla.
 */
function StageField({
  id,
  label,
  unit,
  min,
  checked,
  value,
  disabled,
  onToggle,
  onValue,
}: {
  id: string
  label: string
  unit: string
  min: number
  checked: boolean
  value: string
  disabled: boolean
  onToggle: (checked: boolean) => void
  onValue: (value: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <label className={cn('flex items-center gap-3', disabled ? 'opacity-60' : 'cursor-pointer')}>
        <input
          type="checkbox"
          className="accent-primary size-4 shrink-0"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onToggle(event.target.checked)}
        />
        <span className="text-sm">{label}</span>
      </label>

      {/*
        El número solo existe si la etapa está encendida: apagada no hay nada que
        contar, y un campo activo al lado de una casilla vacía invita a escribir
        algo que no se va a guardar.
      */}
      {checked && (
        <span className="flex items-center gap-2">
          <Input
            id={id}
            type="number"
            className="w-20"
            aria-label={`${label}, ${unit}`}
            min={min}
            max={90}
            required
            value={value}
            disabled={disabled}
            onChange={(event) => onValue(event.target.value)}
          />
          <span className="text-muted-foreground text-sm">{unit}</span>
        </span>
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
  emptyTone = 'warning',
  templates,
  value,
  disabled,
  onChange,
}: {
  id: string
  label: string
  emptyWarning: string
  /**
   * Qué pesa el hueco. Sin plantilla de «por vencer» o de mora **ese aviso no
   * sale**, y eso es ámbar; sin la de resumen el aviso sale igual, solo que sin
   * el conteo — degradar no es fallar, así que no gasta el ámbar (§7).
   */
  emptyTone?: 'warning' | 'muted'
  templates: WhatsAppTemplate[]
  value: string
  disabled: boolean
  onChange: (value: string) => void
}) {
  const chosen = templates.find((t) => t.templateKey === value)
  const conDatos = templates.filter(saysWherePay)
  const sinDatos = templates.filter((t) => !saysWherePay(t))
  /*
    Solo cuando ya está aprobada: mientras Meta la revisa no hay nada que hacer y
    el aviso sería ruido durante horas. El repunte es un acto del usuario —el
    backend no cambia la política solo— y hasta ahora nadie se lo iba a explicar.
  */
  const repunte = paymentAwareUpgrade(value, templates)
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
        {/*
          Dos generaciones agrupadas, no seis opciones en fila. Las nuevas
          conviven con las viejas en vez de reemplazarlas porque cambiar el texto
          de una plantilla obliga a crearla de nuevo en Meta, y pisar la clave
          existente dejaría la cobranza muda durante las horas de la revisión.
          Sin agrupar, el desplegable se llena y nada dice qué las distingue.
        */}
        {conDatos.length > 0 && (
          <optgroup label="Dicen dónde pagar">
            {conDatos.map((template) => (
              <TemplateOption key={template.templateKey} template={template} />
            ))}
          </optgroup>
        )}
        {sinDatos.length > 0 && (
          <optgroup label="Sin datos de pago">
            {sinDatos.map((template) => (
              <TemplateOption key={template.templateKey} template={template} />
            ))}
          </optgroup>
        )}
      </NativeSelect>

      {/*
        El repunte es un acto del usuario: el backend no cambia la política solo.
        Sin esto, quien tenga la vieja puesta se encontraría seis opciones en el
        desplegable y ninguna pista de que hay una mejor ya lista.
      */}
      {repunte && (
        <p className="text-xs">
          <button
            type="button"
            className="text-brand underline"
            disabled={disabled}
            onClick={() => onChange(repunte.templateKey)}
          >
            Hay una versión que dice dónde pagar, y ya está aprobada. Usarla
          </button>
        </p>
      )}

      {value === '' ? (
        <p
          className={
            emptyTone === 'warning' ? 'text-warning-strong text-xs' : 'text-muted-foreground text-xs'
          }
        >
          {emptyWarning}
        </p>
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

/** Una plantilla en el desplegable, con lo único que impide elegirla bien. */
function TemplateOption({ template }: { template: WhatsAppTemplate }) {
  return (
    <option value={template.templateKey}>
      {template.name}
      {/* `canSend` viene calculado: no se deduce del `status`. */}
      {template.canSend ? '' : ' — todavía no se puede enviar'}
    </option>
  )
}
