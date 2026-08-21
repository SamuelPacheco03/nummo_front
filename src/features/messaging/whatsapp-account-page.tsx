import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
      ) : connected ? (
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {account?.phoneNumberLabel ?? 'Tu número de WhatsApp'}
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

              {/* `connected` y `account` son dos campos, y el contrato permite
                  la combinación rara. Se manda `connected`, que es lo que decide
                  por dónde sale; del detalle se enseña lo que haya. */}
              <DetailRows>
                <DetailRow label="ID del número">
                  <span className="nums">{account?.phoneNumberId ?? '—'}</span>
                </DetailRow>
                {/*
                  El token **nunca vuelve del backend**: solo sus últimos cuatro
                  caracteres, que sirven para reconocer cuál está puesto y no para
                  escribirle a nadie. Por eso se enseña enmascarado y el
                  formulario no lo rellena: cambiarlo es volver a pedirlo entero.
                */}
                <DetailRow label="Token de acceso">
                  <span className="nums">
                    {account ? `••••••••${account.accessTokenLast4}` : '—'}
                  </span>
                </DetailRow>
                <DetailRow label="Cuenta de negocio (WABA)">{account?.wabaId ?? '—'}</DetailRow>
                <DetailRow label="Clave de la app">
                  {account?.hasAppSecret ? 'Configurada' : 'Sin configurar'}
                </DetailRow>
                <DetailRow label="Actualizado">
                  {account ? formatDateHuman(account.updatedAt) : '—'}
                </DetailRow>
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

      {/*
        Montado **solo mientras está abierto** (§45.7). Con el diálogo siempre en
        el árbol, devolver `null` no lo desmonta: React conserva su estado, así
        que un token escrito y abandonado reaparecía al volver a abrir. Aquí eso
        no es una molestia de formulario, es un secreto que sigue en pantalla.
      */}
      {formOpen && (
      <ConnectDialog
        open
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
      )}

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

const connectSchema = z.object({
  phoneNumberId: z.string().trim().min(1, 'Sin el ID del número no se puede enviar nada.'),
  phoneNumberLabel: z.string().trim().max(120).optional(),
  accessToken: z.string().trim().min(1, 'Hace falta el token que da Meta.'),
  wabaId: z.string().trim().optional(),
  appSecret: z.string().trim().optional(),
})

type ConnectValues = z.infer<typeof connectSchema>

/**
 * Conectar o reemplazar.
 *
 * **Nunca rellena el token**, ni siquiera al reemplazar: el backend no lo
 * devuelve, así que un campo prerrellenado sería una mentira que además se
 * guardaría tal cual.
 *
 * Valida con Zod y no con el `required` del navegador: `FormDialog` monta su
 * `<form>` con `noValidate`, así que los atributos nativos no paran nada — se
 * enviaba el formulario vacío y el 422 llegaba desde el API. Es el mismo patrón
 * que el resto de formularios de Configuración (§86.3).
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
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ConnectValues>({ resolver: zodResolver(connectSchema) })

  const submit = handleSubmit((values) =>
    onSubmit({
      phoneNumberId: values.phoneNumberId,
      // Vacío es «no lo pongo», que en el contrato es `null` y no una cadena.
      phoneNumberLabel: values.phoneNumberLabel || null,
      accessToken: values.accessToken,
      wabaId: values.wabaId || null,
      appSecret: values.appSecret || null,
    }),
  )

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={replacing ? 'Reemplazar credenciales' : 'Conectar tu número de WhatsApp'}
      description="Los datos salen del panel de WhatsApp Business de Meta."
      submitLabel={replacing ? 'Reemplazar' : 'Conectar'}
      loading={loading}
      onSubmit={submit}
    >
      <Field
        label="ID del número de teléfono"
        htmlFor="phone-number-id"
        required
        error={errors.phoneNumberId?.message}
        hint="En Meta: WhatsApp → Configuración de la API → «Phone number ID»."
      >
        <Input id="phone-number-id" {...register('phoneNumberId')} />
      </Field>

      <Field
        label="Nombre para reconocerlo"
        htmlFor="phone-label"
        error={errors.phoneNumberLabel?.message}
        hint="Solo para ti: «Cobranza», «Sede norte»."
      >
        <Input id="phone-label" {...register('phoneNumberLabel')} />
      </Field>

      <Field
        label="Token de acceso"
        htmlFor="access-token"
        required
        error={errors.accessToken?.message}
        hint={
          replacing
            ? 'Escríbelo entero: no lo guardamos de forma que se pueda volver a leer, así que no podemos traerte el que hay puesto.'
            : 'Se guarda cifrado. A partir de ahí solo verás sus últimos cuatro caracteres.'
        }
      >
        <Input id="access-token" type="password" autoComplete="off" {...register('accessToken')} />
      </Field>

      <Field
        label="ID de la cuenta de negocio (WABA)"
        htmlFor="waba-id"
        error={errors.wabaId?.message}
        hint="Opcional. En Meta: WhatsApp → Configuración de la API → «WhatsApp Business Account ID»."
      >
        <Input id="waba-id" {...register('wabaId')} />
      </Field>

      <Field
        label="Clave de la app"
        htmlFor="app-secret"
        error={errors.appSecret?.message}
        hint="Opcional. Sirve para verificar que los avisos de entrega vienen de Meta."
      >
        <Input id="app-secret" type="password" autoComplete="off" {...register('appSecret')} />
      </Field>
    </FormDialog>
  )
}
