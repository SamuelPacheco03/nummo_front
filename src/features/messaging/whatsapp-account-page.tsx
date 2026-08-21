import { useState } from 'react'
import { Link } from 'react-router'
import { Lock, Phone, Unplug } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DetailRow, DetailRows } from '@/components/ui/detail-drawer'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Field } from '@/components/ui/field'
import { FormDialog } from '@/components/ui/form-dialog'
import { Input } from '@/components/ui/input'
import { Note } from '@/components/ui/note'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { toastApiError } from '@/features/platform/errors'
import { useCan, useFeature } from '@/features/platform/permissions'
import { errorCode, isApiStatus } from '@/lib/errors'
import { formatDateHuman } from '@/lib/format'
import {
  useConnectWhatsAppAccount,
  useDisconnectWhatsAppAccount,
  useWhatsAppAccount,
} from './hooks'

/**
 * **Desde qué número sale la cobranza.**
 *
 * Es una pregunta distinta de «¿puedo cobrar por WhatsApp?», y confundirlas es el
 * error que esta pantalla existe para evitar. `whatsapp_outbound` enciende el
 * ciclo; esto decide **por dónde sale**:
 *
 * - **Sin conectar** —el estado normal, no un fallo—: sale por el número de
 *   Nummo y cada mensaje consume cuota del plan.
 * - **Conectada**: sale por el número del negocio, los mensajes se los paga a
 *   Meta directamente y **dejan de consumir cuota**.
 *
 * De ahí que no conectar no se pinte como error ni como algo a medias: es una de
 * las dos formas legítimas de tener esto funcionando.
 */
export function WhatsAppAccountPage() {
  const { orgId } = useCurrentOrg()
  const can = useCan()
  const canRead = can('whatsapp.settings.read')
  const canManage = can('whatsapp.settings.manage')
  const hasByo = useFeature('whatsapp_byo')

  // Las tres rutas van detrás de `whatsapp_byo`: pedirla sin el plan sería
  // provocar el 403 que esta pantalla existe para no tener que enseñar (§88.5).
  const { connected, account, isPending, isError, error, refetch } = useWhatsAppAccount(
    canRead ? orgId : undefined,
    hasByo,
  )
  const connect = useConnectWhatsAppAccount(orgId ?? '')
  const disconnect = useDisconnectWhatsAppAccount(orgId ?? '')

  const [formOpen, setFormOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (!canRead) {
    return (
      <div className="space-y-4">
        <PageHeader title="Número de WhatsApp" />
        <EmptyState
          Icon={Lock}
          title="No puedes ver esto"
          description="Tu rol no incluye la configuración del canal de WhatsApp."
        />
      </div>
    )
  }

  const onDisconnect = async () => {
    if (!orgId) return
    try {
      await disconnect.mutateAsync({ orgId })
      toast.success('Número desconectado', {
        description: 'La cobranza sigue saliendo, ahora por el número de Nummo.',
      })
      setConfirmOpen(false)
    } catch (err) {
      // Desconectar lo que no estaba conectado no es un fallo que haya que
      // investigar: la pantalla ya decía lo contrario, así que se refresca.
      if (isApiStatus(err, 404)) {
        toast.success('No había ningún número propio conectado')
        setConfirmOpen(false)
        refetch()
        return
      }
      toastApiError(err, 'No se pudo desconectar el número')
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Número de WhatsApp"
        description="Desde qué número le escribe Nummo a quien te debe."
      />

      {!hasByo ? (
        /* Sin la feature no se pide nada y se cuenta lo que sí está pasando: se
           envía igual, por el número de Nummo. */
        <div className="space-y-4">
          <NummoNumberCard />
          <Note tone="info" title="Tu plan no incluye conectar tu propio número">
            Con tu número, los mensajes se los pagas a Meta y dejan de gastar el cupo del plan.{' '}
            <Link to="/config/plan" className="text-brand underline">
              Ver planes
            </Link>
          </Note>
        </div>
      ) : isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : isError ? (
        <ErrorState
          error={error}
          fallback="No se pudo cargar la cuenta de WhatsApp."
          onRetry={refetch}
        />
      ) : connected && account ? (
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {account.phoneNumberLabel ?? 'Tu número de WhatsApp'}
                  </p>
                  <StatusBadge tone="success" label="Conectado" />
                </div>
                {canManage && (
                  <div className="flex shrink-0 gap-2">
                    <Button variant="outline" size="sm" onClick={() => setFormOpen(true)}>
                      Reemplazar credenciales
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(true)}>
                      <Unplug aria-hidden className="size-4" />
                      Desconectar
                    </Button>
                  </div>
                )}
              </div>

              <DetailRows>
                <DetailRow label="ID del número">
                  <span className="nums">{account.phoneNumberId}</span>
                </DetailRow>
                {/*
                  El token **nunca vuelve del backend**: solo sus últimos cuatro
                  caracteres, que sirven para reconocer cuál está puesto y no para
                  escribirle a nadie. Por eso se enseña enmascarado y el
                  formulario no lo rellena: cambiarlo es volver a pedirlo entero.
                */}
                <DetailRow label="Token de acceso">
                  <span className="nums">••••••••{account.accessTokenLast4}</span>
                </DetailRow>
                <DetailRow label="Cuenta de negocio (WABA)">
                  {account.wabaId ?? '—'}
                </DetailRow>
                <DetailRow label="Clave de la app">
                  {account.hasAppSecret ? 'Configurada' : 'Sin configurar'}
                </DetailRow>
                <DetailRow label="Actualizado">{formatDateHuman(account.updatedAt)}</DetailRow>
              </DetailRows>
            </CardContent>
          </Card>

          <Note tone="tip" title="Estos mensajes no gastan cupo del plan">
            Con tu número conectado, los mensajes se los pagas a Meta directamente y el cupo
            mensual de Nummo deja de bajar.
          </Note>
        </div>
      ) : (
        <div className="space-y-4">
          <NummoNumberCard
            action={
              canManage ? (
                <Button onClick={() => setFormOpen(true)}>
                  <Phone aria-hidden className="size-4" />
                  Conectar mi número
                </Button>
              ) : undefined
            }
          />
        </div>
      )}

      <ConnectDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        replacing={connected}
        loading={connect.isPending}
        onSubmit={async (data) => {
          if (!orgId) return
          try {
            await connect.mutateAsync({ orgId, data })
            toast.success(connected ? 'Credenciales actualizadas' : 'Número conectado')
            setFormOpen(false)
          } catch (err) {
            // El número es único en todo Nummo: es lo que identifica de quién es
            // un webhook entrante. Un 409 aquí no es «algo salió mal».
            if (errorCode(err) === 'CONFLICT' || isApiStatus(err, 409)) {
              toast.error('Ese número ya está conectado en otra organización', {
                description:
                  'Un número solo puede pertenecer a una. Desconéctalo allí antes de conectarlo aquí.',
              })
              return
            }
            toastApiError(err, 'No se pudo conectar el número')
          }
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Desconectar tu número"
        /* Lo que nadie adivina, y por eso va antes de aceptar: desconectar **no
           apaga la cobranza**. */
        description="La cobranza no se apaga: los mensajes vuelven a salir por el número de Nummo, y vuelven a gastar el cupo mensual de tu plan."
        confirmLabel="Desconectar"
        destructive
        loading={disconnect.isPending}
        onConfirm={() => void onDisconnect()}
      />
    </div>
  )
}

/** El estado por defecto, contado como lo que es y no como una carencia. */
function NummoNumberCard({ action }: { action?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium">Sale por el número de Nummo</p>
          <p className="text-muted-foreground text-sm">
            Funciona sin configurar nada. Cada mensaje descuenta del cupo mensual de tu plan.
          </p>
        </div>
        {action}
      </CardContent>
    </Card>
  )
}

interface ConnectFields {
  phoneNumberId: string
  phoneNumberLabel: string | null
  accessToken: string
  wabaId: string | null
  appSecret: string | null
}

/**
 * Conectar o reemplazar. **Nunca rellena el token**, ni siquiera al reemplazar:
 * el backend no lo devuelve, así que un campo prerrellenado sería una mentira
 * que además se guardaría tal cual.
 */
function ConnectDialog({
  open,
  onOpenChange,
  replacing,
  loading,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  replacing: boolean
  loading: boolean
  onSubmit: (data: ConnectFields) => Promise<void>
}) {
  const [phoneNumberId, setPhoneNumberId] = useState('')
  const [phoneNumberLabel, setPhoneNumberLabel] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [wabaId, setWabaId] = useState('')
  const [appSecret, setAppSecret] = useState('')

  // Se monta solo mientras está abierto, así que el estado de partida lo ponen
  // los inicializadores y no hace falta efecto (§45.7).
  if (!open) return null

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={replacing ? 'Reemplazar credenciales' : 'Conectar tu número de WhatsApp'}
      description="Los datos salen del panel de WhatsApp Business de Meta."
      submitLabel={replacing ? 'Reemplazar' : 'Conectar'}
      loading={loading}
      onSubmit={(event) => {
        event.preventDefault()
        void onSubmit({
          phoneNumberId: phoneNumberId.trim(),
          phoneNumberLabel: phoneNumberLabel.trim() || null,
          accessToken: accessToken.trim(),
          wabaId: wabaId.trim() || null,
          appSecret: appSecret.trim() || null,
        })
      }}
    >
      <Field label="ID del número de teléfono" htmlFor="phone-number-id" required>
        <Input
          id="phone-number-id"
          value={phoneNumberId}
          required
          onChange={(e) => setPhoneNumberId(e.target.value)}
        />
      </Field>

      <Field
        label="Nombre para reconocerlo"
        htmlFor="phone-label"
        hint="Solo para ti: «Cobranza», «Sede norte»."
      >
        <Input
          id="phone-label"
          value={phoneNumberLabel}
          onChange={(e) => setPhoneNumberLabel(e.target.value)}
        />
      </Field>

      <Field
        label="Token de acceso"
        htmlFor="access-token"
        required
        hint={
          replacing
            ? 'Escríbelo entero: no lo guardamos de forma que se pueda volver a leer, así que no podemos traerte el que hay puesto.'
            : 'Se guarda cifrado. A partir de ahí solo verás sus últimos cuatro caracteres.'
        }
      >
        <Input
          id="access-token"
          type="password"
          autoComplete="off"
          value={accessToken}
          required
          onChange={(e) => setAccessToken(e.target.value)}
        />
      </Field>

      <Field label="ID de la cuenta de negocio (WABA)" htmlFor="waba-id">
        <Input id="waba-id" value={wabaId} onChange={(e) => setWabaId(e.target.value)} />
      </Field>

      <Field
        label="Clave de la app"
        htmlFor="app-secret"
        hint="Opcional. Sirve para verificar que los avisos de entrega vienen de Meta."
      >
        <Input
          id="app-secret"
          type="password"
          autoComplete="off"
          value={appSecret}
          onChange={(e) => setAppSecret(e.target.value)}
        />
      </Field>
    </FormDialog>
  )
}
