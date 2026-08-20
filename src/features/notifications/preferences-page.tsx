import { useState } from 'react'
import { Link } from 'react-router'
import { Lock } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Loader } from '@/components/ui/loader'
import { Note } from '@/components/ui/note'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { toastApiError } from '@/features/platform/errors'
import { useCan } from '@/features/platform/permissions'
import { useHydrateOnce } from '@/lib/use-hydrate-once'
import { cn } from '@/lib/utils'
import type {
  NotificationPreference,
  NotificationPreferences,
  NotificationPreferencesPushPreview,
  UpdateNotificationPreferencesInputPreferencesItem,
} from '@/api/generated/model'
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useUpdatePushPreview,
} from './hooks'
import { PushDevices } from './push-devices'
import {
  channelColumn,
  channelLabel,
  interruptingChannels,
  leadDaysText,
  notificationCategory,
  notificationTypeCopy,
  NOTIFICATION_CATEGORIES,
  type NotificationChannel,
} from './labels'

/** Lo que la persona lleva tocado de un tipo, antes de guardar. */
interface Draft {
  enabled: boolean
  channels: NotificationChannel[]
}

const sameChannels = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((channel) => b.includes(channel))

/**
 * Lo que hay que mandar: **solo los tipos que cambiaron**.
 *
 * Se calcula al enviar, comparando el borrador con lo que firmó el servidor, en
 * vez de ir marcando sucia cada casilla que se toca. Es más fiable por un caso
 * concreto: apagar algo y volver a encenderlo deja de contar como cambio, que es
 * lo que cualquiera esperaría y lo que un contador de «tocados» no sabe.
 */
function changedPreferences(
  preferences: NotificationPreference[],
  draft: Record<string, Draft>,
): UpdateNotificationPreferencesInputPreferencesItem[] {
  return preferences
    .filter((preference) => {
      const mine = draft[preference.type]
      if (!mine) return false
      return (
        mine.enabled !== preference.enabled || !sameChannels(mine.channels, preference.channels)
      )
    })
    .map((preference) => ({
      type: preference.type,
      enabled: draft[preference.type].enabled,
      channels: draft[preference.type].channels,
    }))
}

function toDraft(preferences: NotificationPreferences): Record<string, Draft> {
  return Object.fromEntries(
    preferences.preferences.map((preference) => [
      preference.type,
      { enabled: preference.enabled, channels: [...preference.channels] },
    ]),
  )
}

function PreferenceRow({
  preference,
  draft,
  columns,
  disabled,
  onToggle,
  onChannel,
}: {
  preference: NotificationPreference
  draft: Draft
  columns: NotificationChannel[]
  disabled: boolean
  onToggle: () => void
  onChannel: (channel: NotificationChannel) => void
}) {
  const { label, hint } = notificationTypeCopy(preference.type)

  return (
    <li className="flex items-start gap-3 py-3">
      <label
        className={cn(
          'flex min-w-0 flex-1 items-start gap-2.5',
          disabled ? 'opacity-60' : 'cursor-pointer',
        )}
      >
        <input
          type="checkbox"
          className="accent-primary mt-0.5 size-4 shrink-0"
          checked={draft.enabled}
          disabled={disabled}
          onChange={onToggle}
        />
        <span className="min-w-0">
          <span className="block text-sm">{label}</span>
          {hint && <span className="text-muted-foreground block text-xs">{hint}</span>}
          {preference.supportsLeadDays && preference.leadDays.length > 0 && (
            <span className="text-muted-foreground block text-xs">
              Te avisamos {leadDaysText(preference.leadDays)}
            </span>
          )}
        </span>
      </label>

      <div className="flex shrink-0">
        {columns.map((channel) =>
          preference.supportedChannels.includes(channel) ? (
            /* La casilla es de 16 px; el rótulo la envuelve hasta los 44 que
               pide un dedo (§43). */
            <label
              key={channel}
              className={cn(
                'grid w-11 place-items-center py-1',
                disabled || !draft.enabled ? 'opacity-60' : 'cursor-pointer',
              )}
            >
              <input
                type="checkbox"
                className="accent-primary size-4"
                aria-label={`${channelLabel(channel)} · ${label}`}
                checked={draft.channels.includes(channel)}
                // Un canal para un aviso que no quieres no significa nada.
                disabled={disabled || !draft.enabled}
                onChange={() => onChannel(channel)}
              />
            </label>
          ) : (
            <span
              key={channel}
              aria-hidden
              className="text-muted-foreground grid w-11 place-items-center py-1 text-xs"
            >
              —
            </span>
          ),
        )}
      </div>
    </li>
  )
}

/**
 * **De qué te avisamos y por dónde.**
 *
 * Es la pantalla de la persona, no de la organización: cada miembro elige lo
 * suyo. La política común —a qué hora salen los recordatorios, desde qué saldo
 * se avisa— vive aparte y detrás de otro permiso.
 *
 * El catálogo entero lo firma el backend, y **la pantalla se dibuja desde él**:
 * qué tipos hay, qué canales admite cada uno y cuáles están encendidos en este
 * despliegue. Una lista nuestra en paralelo se desincronizaría con el primer
 * tipo nuevo, y ese es justo el que nadie podría apagar.
 */
export function NotificationPreferencesPage() {
  const { orgId } = useCurrentOrg()
  const can = useCan()
  const canRead = can('notifications.read')
  const canManage = can('notifications.manage')

  const { preferences, isPending, isError, error, refetch } = useNotificationPreferences(
    canRead ? orgId : undefined,
  )
  const savePreferences = useUpdateNotificationPreferences(orgId ?? '')
  const savePreview = useUpdatePushPreview(orgId ?? '')
  const saving = savePreferences.isPending || savePreview.isPending

  const [draft, setDraft] = useState<Record<string, Draft>>({})
  const [preview, setPreview] = useState<NotificationPreferencesPushPreview>('FULL')

  const hydrate = (data: NotificationPreferences) => {
    setDraft(toDraft(data))
    setPreview(data.pushPreview)
  }
  /*
    La clave lleva `preferences` delante y no es un adorno: `useHydrateOnce` solo
    reacciona a la clave, así que con `orgId` a secas —que se resuelve **antes**
    que la consulta— el efecto correría con el registro todavía vacío y no
    volvería a correr nunca. La clave tiene que aparecer con el dato, no antes.
  */
  useHydrateOnce(preferences ? orgId : undefined, preferences, hydrate)

  if (!canRead) {
    return (
      <div className="space-y-4">
        <PageHeader title="Notificaciones" />
        <EmptyState
          Icon={Lock}
          title="No puedes ver esto"
          description="Tu rol no incluye las notificaciones de esta organización."
        />
      </div>
    )
  }

  const items = preferences?.preferences ?? []
  const available = (preferences?.availableChannels ?? []) as NotificationChannel[]

  /*
    Las columnas son los canales que **interrumpen** y que este despliegue tiene
    encendidos, de entre los que algún tipo admite. Salen del contrato, así que
    el día que exista remitente de correo aparece la columna sola.
  */
  const columns = available.filter(
    (channel) =>
      channel !== 'INAPP' &&
      items.some((item) =>
        interruptingChannels(item.supportedChannels, available).includes(channel),
      ),
  )

  const groups = NOTIFICATION_CATEGORIES.map((category) => ({
    category,
    items: items.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0)

  const pending = changedPreferences(items, draft)
  const previewChanged = preferences != null && preview !== preferences.pushPreview
  const dirty = pending.length > 0 || previewChanged

  const toggle = (type: string) =>
    setDraft((current) => ({
      ...current,
      [type]: { ...current[type], enabled: !current[type].enabled },
    }))

  const toggleChannel = (type: string, channel: NotificationChannel) =>
    setDraft((current) => {
      const mine = current[type]
      const channels = mine.channels.includes(channel)
        ? mine.channels.filter((one) => one !== channel)
        : [...mine.channels, channel]
      return { ...current, [type]: { ...mine, channels } }
    })

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!orgId || !dirty) return
    try {
      /*
        Dos endpoints, un botón: que el detalle en la pantalla de bloqueo se
        guarde aparte es cosa del contrato, no algo que el usuario tenga que
        entender. Se manda solo lo que cambió de cada uno.
      */
      let saved: NotificationPreferences | undefined
      if (pending.length > 0) {
        const res = await savePreferences.mutateAsync({
          orgId,
          data: { preferences: pending },
        })
        saved = res.data as NotificationPreferences
      }
      if (previewChanged) {
        const res = await savePreview.mutateAsync({ orgId, data: { pushPreview: preview } })
        saved = res.data as NotificationPreferences
      }
      // La pantalla se queda, así que hay que volver a marcarla limpia a mano
      // con lo que respondió el servidor: `useHydrateOnce` ya no va a hacerlo
      // (§45.7). Y con la respuesta, no con el borrador, para que una
      // normalización del backend no deje el botón encendido para siempre.
      if (saved) hydrate(saved)
      toast.success('Preferencias guardadas')
    } catch (err) {
      toastApiError(err, 'No se pudieron guardar las preferencias')
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notificaciones"
        description="Elige de qué te avisamos y por dónde. Es tu configuración, no la de la organización."
      />

      {/* Antes que los interruptores: marcar «Móvil» sin esto activado no
          entrega nada, y es la pregunta que deja esa columna abierta. */}
      <PushDevices />

      {isPending ? (
        <Skeleton className="h-96 w-full" />
      ) : isError ? (
        <ErrorState
          error={error}
          fallback="No se pudieron cargar tus preferencias."
          onRetry={() => void refetch()}
        />
      ) : (
        <form onSubmit={onSubmit}>
          <Card>
            <CardContent className="space-y-8">
              {columns.includes('PUSH') && (
                <section className="space-y-3">
                  <div className="space-y-1">
                    <h2 className="text-sm font-medium">En la pantalla de bloqueo</h2>
                    <p className="text-muted-foreground text-sm">
                      Cuánto se ve de un aviso sin desbloquear el teléfono.
                    </p>
                  </div>
                  {canManage ? (
                    <SegmentedControl
                      aria-label="Detalle en la pantalla de bloqueo"
                      value={preview}
                      onChange={setPreview}
                      options={[
                        { value: 'FULL', label: 'Todo el detalle' },
                        { value: 'DISCREET', label: 'Discreto' },
                      ]}
                    />
                  ) : (
                    <p className="text-sm">
                      {preview === 'FULL' ? 'Todo el detalle' : 'Discreto'}
                    </p>
                  )}
                  <p className="text-muted-foreground text-xs">
                    {preview === 'FULL'
                      ? 'Se lee el aviso entero, con nombres y cifras.'
                      : 'Solo dice «Tienes una notificación nueva». El detalle, al abrir Nummo.'}
                  </p>
                </section>
              )}

              <section className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-medium">Qué te avisamos</h2>
                  <p className="text-muted-foreground text-sm">
                    Todo lo que dejes encendido queda en tu centro de notificaciones.
                    {columns.length > 0 && ' Marca además por dónde quieres que te interrumpa.'}
                  </p>
                </div>

                {!canManage && (
                  <Note tone="info" title="Solo puedes mirar">
                    Tu rol no incluye cambiar estas preferencias. Quien administre la organización
                    puede dártelo.
                  </Note>
                )}

                {columns.length > 0 && (
                  <div aria-hidden className="flex justify-end">
                    {columns.map((channel) => (
                      <span
                        key={channel}
                        className="text-muted-foreground w-11 text-center text-xs tracking-wider uppercase"
                      >
                        {channelColumn(channel)}
                      </span>
                    ))}
                  </div>
                )}

                {groups.map((group) => (
                  <div key={group.category} className="space-y-1">
                    <h3 className="text-muted-foreground text-xs tracking-wider uppercase">
                      {notificationCategory(group.category)}
                    </h3>
                    <ul className="divide-y">
                      {group.items.map((preference) => {
                        const mine = draft[preference.type]
                        if (!mine) return null
                        return (
                          <PreferenceRow
                            key={preference.type}
                            preference={preference}
                            draft={mine}
                            columns={columns}
                            disabled={!canManage}
                            onToggle={() => toggle(preference.type)}
                            onChannel={(channel) => toggleChannel(preference.type, channel)}
                          />
                        )
                      })}
                    </ul>
                  </div>
                ))}

                {/* De dónde salen los días y los umbrales que esta pantalla
                    solo enseña: es la pregunta que deja «Te avisamos 5 y 1 días
                    antes» sin contestar. */}
                <p className="text-muted-foreground text-sm">
                  La hora de los recordatorios y los umbrales los fija la organización en{' '}
                  <Link className="text-brand underline underline-offset-4" to="/config/avisos">
                    la política de avisos
                  </Link>
                  .
                </p>
              </section>
            </CardContent>

            {canManage && (
              <CardFooter className="justify-end">
                <Button type="submit" disabled={!dirty || saving}>
                  {saving && <Loader size="sm" />}
                  Guardar cambios
                </Button>
              </CardFooter>
            )}
          </Card>
        </form>
      )}
    </div>
  )
}
