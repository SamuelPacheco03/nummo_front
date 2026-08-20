import { useCallback, useEffect, useState } from 'react'
import { BellOff, Smartphone, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader } from '@/components/ui/loader'
import { Note } from '@/components/ui/note'
import { Skeleton } from '@/components/ui/skeleton'
import { toastApiError } from '@/features/platform/errors'
import { formatRelativeTime } from '@/lib/format'
import { InstallAppButton } from '@/pwa/install-app-button'
import {
  currentPushSubscription,
  deviceLabel,
  forgetPushDevice,
  pushPermission,
  pushSupported,
  rememberPushDevice,
  rememberedPushDevice,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/pwa/push'
import type { PushSubscription as PushDevice } from '@/api/generated/model'
import { usePushDevices, usePushPublicKey, useRegisterPushDevice, useRemovePushDevice } from './hooks'

/**
 * **Los avisos que llegan con la aplicación cerrada.**
 *
 * Va en la pantalla de preferencias y no en «Aplicación», aunque sea estado del
 * aparato, por una razón de uso: quien marca la columna «Móvil» de un aviso y no
 * ha activado el push en este navegador no recibe nada y no tiene forma de
 * saberlo. El interruptor y su condición se miran juntos.
 *
 * Es una tarjeta aparte de las preferencias, y **fuera de su formulario**:
 * activar el push abre el diálogo de permisos del navegador, así que es una
 * acción con su botón, no una casilla que se guarda al final.
 */
export function PushDevices() {
  const { publicKey, isPending: keyPending } = usePushPublicKey()
  // Sin clave pública el push no está configurado en este despliegue: no hay
  // lista que pedir ni permiso que gastar.
  const configured = publicKey != null
  const { devices, isPending: devicesPending } = usePushDevices(configured)
  const register = useRegisterPushDevice()
  const remove = useRemovePushDevice()

  const [endpoint, setEndpoint] = useState<string | undefined>()
  const [permission, setPermission] = useState(() => pushPermission())
  const [working, setWorking] = useState(false)

  /*
    Si este navegador ya está suscrito no lo dice el servidor —su lista no trae
    el `endpoint`—, lo dice el propio navegador. Es sincronizar con un sistema
    externo, que es para lo que sirve un efecto (§87.6).
  */
  const refreshLocal = useCallback(async () => {
    const subscription = await currentPushSubscription()
    setEndpoint(subscription?.endpoint)
    setPermission(pushPermission())
  }, [])

  useEffect(() => {
    void refreshLocal()
  }, [refreshLocal])

  const supported = pushSupported()
  const active = endpoint != null
  const thisDeviceId = rememberedPushDevice(endpoint)

  const activate = async () => {
    if (!publicKey) return
    setWorking(true)
    try {
      const registration = await subscribeToPush(publicKey)
      if (!registration) {
        // Dijeron que no, o el navegador no dio las claves. Ninguna de las dos
        // se arregla reintentando, así que no se ofrece.
        setPermission(pushPermission())
        return
      }
      const created = await register.mutateAsync({
        data: { ...registration, deviceLabel: deviceLabel(navigator.userAgent) },
      })
      const device = created.data as PushDevice
      rememberPushDevice(registration.endpoint, device.id)
      await refreshLocal()
      toast.success('Este dispositivo recibirá avisos')
    } catch (err) {
      toastApiError(err, 'No se pudo activar en este dispositivo')
    } finally {
      setWorking(false)
    }
  }

  const deactivate = async () => {
    setWorking(true)
    try {
      const id = thisDeviceId
      await unsubscribeFromPush()
      /*
        Se da de baja también en el servidor cuando sabemos qué fila somos. Si no
        lo sabemos, la fila se queda hasta el siguiente envío: el backend la
        borra al recibir un 410 del push service. No es lo ideal, pero inventar
        cuál borrar sería peor.
      */
      if (id) await remove.mutateAsync({ id })
      forgetPushDevice()
      await refreshLocal()
      toast.success('Este dispositivo ya no recibirá avisos')
    } catch (err) {
      toastApiError(err, 'No se pudo desactivar en este dispositivo')
    } finally {
      setWorking(false)
    }
  }

  const removeDevice = async (device: PushDevice) => {
    try {
      await remove.mutateAsync({ id: device.id })
      if (device.id === thisDeviceId) {
        await unsubscribeFromPush()
        forgetPushDevice()
        await refreshLocal()
      }
    } catch (err) {
      toastApiError(err, 'No se pudo dar de baja el dispositivo')
    }
  }

  if (keyPending) return <Skeleton className="h-40 w-full" />

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-sm font-medium">Avisos con la app cerrada</h2>
          <p className="text-muted-foreground text-sm">
            Lo que marques como «Móvil» llega aquí, aunque no tengas Nummo abierto.
          </p>
        </div>

        {!configured ? (
          <Note tone="info" title="Todavía no está disponible">
            Este servidor no tiene configurados los avisos al móvil. Lo que marques se guarda y
            empezará a llegar en cuanto se active.
          </Note>
        ) : !supported ? (
          <Note tone="info" title="Este navegador no puede recibirlos">
            En iPhone hacen falta con la aplicación instalada en la pantalla de inicio.
            <div className="mt-2">
              <InstallAppButton className="text-brand underline underline-offset-4" />
            </div>
          </Note>
        ) : permission === 'denied' ? (
          <Note tone="warning" title="Los bloqueaste en este navegador">
            El navegador no vuelve a preguntar: hay que permitir las notificaciones de Nummo desde
            sus ajustes de sitio —el candado junto a la dirección— y volver aquí.
          </Note>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant={active ? 'outline' : 'default'}
              onClick={active ? deactivate : activate}
              disabled={working}
            >
              {working && <Loader size="sm" />}
              {active ? <BellOff className="size-4" /> : <Smartphone className="size-4" />}
              {active ? 'Desactivar en este dispositivo' : 'Activar en este dispositivo'}
            </Button>
            <span className="text-muted-foreground text-sm">
              {active ? 'Este dispositivo está activado.' : 'Este dispositivo no recibe avisos.'}
            </span>
          </div>
        )}

        {configured && (
          <div className="space-y-2">
            <h3 className="text-muted-foreground text-xs tracking-wider uppercase">
              Tus dispositivos
            </h3>
            {devicesPending ? (
              <Skeleton className="h-12 w-full" />
            ) : devices.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Ninguno todavía. Actívalo en cada teléfono o navegador donde quieras recibirlos.
              </p>
            ) : (
              <ul className="divide-y">
                {devices.map((device) => (
                  <li key={device.id} className="flex items-center gap-3 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm">
                        {device.deviceLabel ?? 'Dispositivo sin nombre'}
                        {device.id === thisDeviceId && (
                          <span className="text-muted-foreground"> · este</span>
                        )}
                      </span>
                      <span className="text-muted-foreground block text-xs">
                        {device.lastUsedAt
                          ? `Último aviso ${formatRelativeTime(device.lastUsedAt)}`
                          : 'Todavía no ha recibido ninguno'}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => void removeDevice(device)}
                      aria-label={`Dar de baja ${device.deviceLabel ?? 'este dispositivo'}`}
                      className="text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:ring-ring/50 grid size-9 shrink-0 place-items-center rounded-md transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
