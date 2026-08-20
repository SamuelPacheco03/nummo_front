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
import { MoneyInput } from '@/components/ui/money-input'
import { Note } from '@/components/ui/note'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { toastApiError } from '@/features/platform/errors'
import { useCan } from '@/features/platform/permissions'
import { useHydrateOnce } from '@/lib/use-hydrate-once'
import type { NotificationSettings } from '@/api/generated/model'
import { useNotificationSettings, useUpdateNotificationSettings } from './hooks'

/** Lo que el backend usa cuando la organización nunca la ha tocado. */
const DEFAULT_REMINDER_TIME = '08:00'

/**
 * **La política de avisos de la organización.**
 *
 * Una sola para todos, y por eso vive aparte de `/config/notificaciones`, que es
 * lo que elige cada persona: apagar los recordatorios de una empresa entera es
 * una decisión, no un ajuste personal. De ahí también el permiso propio —
 * `notifications.settings.manage`, que no tiene ni un administrador por defecto
 * de otra organización—.
 *
 * Se lee con `notifications.read`, así que la pantalla se enseña a cualquiera y
 * lo que desaparece es el botón: esconderla entera diría lo contrario de lo que
 * hace el backend (§47.3).
 *
 * **Un umbral vacío apaga esa alerta**, y es el valor por defecto. No es «umbral
 * cero»: con cero, cualquier peso que registrara un compañero interrumpiría a
 * media oficina, y lo primero que haría cualquiera es apagar la categoría entera.
 */
export function NotificationPolicyPage() {
  const { orgId } = useCurrentOrg()
  const can = useCan()
  const canRead = can('notifications.read')
  const canManage = can('notifications.settings.manage')

  const { settings, isPending, isError, error, refetch } = useNotificationSettings(
    canRead ? orgId : undefined,
  )
  const save = useUpdateNotificationSettings(orgId ?? '')

  const [time, setTime] = useState(DEFAULT_REMINDER_TIME)
  const [lowBalance, setLowBalance] = useState('')
  const [teamActivity, setTeamActivity] = useState('')

  useHydrateOnce(settings?.organizationId, settings, (current) => {
    // Llega como `HH:mm:ss`; `<input type="time">` quiere `HH:mm`.
    setTime(current.reminderLocalTime.slice(0, 5))
    setLowBalance(current.lowBalanceThreshold ?? '')
    setTeamActivity(current.teamActivityThreshold ?? '')
  })

  if (!canRead) {
    return (
      <div className="space-y-4">
        <PageHeader title="Política de avisos" />
        <EmptyState
          Icon={Lock}
          title="No puedes ver esto"
          description="Tu rol no incluye las notificaciones de esta organización."
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
          reminderLocalTime: time,
          // Vacío es «no avisar», no «avisar desde cero».
          lowBalanceThreshold: lowBalance.trim() || null,
          teamActivityThreshold: teamActivity.trim() || null,
        },
      })
      const data = saved.data as NotificationSettings
      // La pantalla se queda: se vuelve a marcar limpia con lo que respondió el
      // servidor, que ya no va a refrescarse sola (§45.7).
      setTime(data.reminderLocalTime.slice(0, 5))
      setLowBalance(data.lowBalanceThreshold ?? '')
      setTeamActivity(data.teamActivityThreshold ?? '')
      toast.success('Política guardada')
    } catch (err) {
      toastApiError(err, 'No se pudo guardar la política')
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Política de avisos"
        description="Cuándo salen los recordatorios de toda la organización y desde qué cifra vale la pena interrumpir."
      />

      {isPending ? (
        <Skeleton className="h-72 w-full" />
      ) : isError ? (
        <ErrorState
          error={error}
          fallback="No se pudo cargar la política."
          onRetry={() => void refetch()}
        />
      ) : (
        <form onSubmit={onSubmit}>
          <Card>
            <CardContent className="space-y-5">
              <Field
                label="Hora de los recordatorios"
                htmlFor="reminder-time"
                hint="En la zona horaria de la organización. A esta hora se revisan los vencimientos y sale el resumen diario."
              >
                <Input
                  id="reminder-time"
                  type="time"
                  className="w-40"
                  value={time}
                  disabled={!canManage}
                  onChange={(event) => setTime(event.target.value)}
                />
              </Field>

              <Field
                label="Avisar cuando una cuenta baje de"
                htmlFor="low-balance"
                hint={`Se compara con tus cuentas en ${settings?.lowBalanceCurrency ?? 'COP'}. Déjalo vacío para no avisar de saldos bajos.`}
              >
                <MoneyInput
                  id="low-balance"
                  value={lowBalance}
                  onChange={setLowBalance}
                  disabled={!canManage}
                  placeholder="500.000"
                />
              </Field>

              <Field
                label="Avisar de lo que registra el equipo desde"
                htmlFor="team-activity"
                hint="Solo se avisa de un movimiento ajeno si llega a este monto. Déjalo vacío para no avisar de la actividad del equipo."
              >
                <MoneyInput
                  id="team-activity"
                  value={teamActivity}
                  onChange={setTeamActivity}
                  disabled={!canManage}
                  placeholder="1.000.000"
                />
              </Field>

              <Note tone="warning" title="Vacío apaga la alerta, no la pone en cero">
                Un umbral en cero haría que cualquier peso interrumpiera a media oficina, y lo
                primero que haría cualquiera es apagar la categoría entera. Los dos nacen vacíos a
                propósito.
              </Note>

              <p className="text-muted-foreground text-sm">
                Esto vale para toda la organización. Cada persona elige además qué le llega y por
                dónde en{' '}
                <Link className="text-brand underline underline-offset-4" to="/config/notificaciones">
                  sus notificaciones
                </Link>
                .
              </p>
            </CardContent>

            {canManage && (
              <CardFooter className="justify-end">
                <Button type="submit" disabled={save.isPending}>
                  {save.isPending && <Loader size="sm" />}
                  Guardar
                </Button>
              </CardFooter>
            )}
          </Card>
        </form>
      )}
    </div>
  )
}
