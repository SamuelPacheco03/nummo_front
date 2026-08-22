import { useState } from 'react'
import { Check, Send, X } from 'lucide-react'
import { toast } from 'sonner'
import { Panel } from '@/components/panel'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ui/error-state'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Note } from '@/components/ui/note'
import { Skeleton } from '@/components/ui/skeleton'
import { toastApiError } from '@/features/platform/errors'
import type { WhatsAppStatusOutput } from '@/api/generated/model'
import { usePlatformWhatsAppStatus, useSendPlatformTestMessage } from './hooks'

/**
 * **Si el canal está configurado en este despliegue, y una prueba para saberlo de verdad.**
 *
 * Era el hueco que dejaba a las otras dos pestañas sin diagnóstico: una cola de entrantes
 * vacía y un catálogo de plantillas vacío **se ven exactamente igual** con el canal
 * apagado que con el canal encendido y sin tráfico. «No llega nada» no se podía distinguir
 * de «no hay nada que llegue».
 *
 * Y por eso el envío de prueba va aquí y no en su propia pestaña: la configuración puede
 * decir que todo está puesto y el mensaje no salir igual. Lo único que cierra la duda es
 * mandarlo.
 */
export function WhatsAppStatusTab() {
  const { status, isPending, isError, error } = usePlatformWhatsAppStatus()

  if (isError) return <ErrorState error={error} fallback="No se pudo leer el estado del canal." />
  if (isPending || !status) return <Skeleton className="h-64 w-full" />

  return (
    <div className="space-y-4">
      <Panel title="Piezas del canal">
        <ul className="divide-y">
          <Pieza ok={status.gatewayConfigured} label="Pasarela hacia Meta" />
          <Pieza ok={status.platformAccountConfigured} label="Cuenta de plataforma" />
          <Pieza ok={status.appSecretConfigured} label="Secreto de la app" />
          <Pieza
            ok={status.verifyTokenConfigured}
            label="Token de verificación del webhook"
            nota="Sin él Meta no entrega nada, y la cola de entrantes se queda vacía sin error."
          />
          <Identificador label="Phone number ID" valor={status.phoneNumberId} />
          <Identificador label="WABA ID" valor={status.wabaId} />
        </ul>
      </Panel>

      <EnvioDePrueba listo={puedeEnviar(status)} />
    </div>
  )
}

/**
 * Qué hace falta para que un envío de prueba tenga sentido.
 *
 * La pasarela y la cuenta de plataforma: sin ellas el botón solo puede dar un error de
 * configuración que la lista de arriba ya está contando mejor. El secreto y el token son
 * de la **entrada** —lo que Meta nos manda— y no estorban a un envío.
 */
function puedeEnviar(status: WhatsAppStatusOutput): boolean {
  return status.gatewayConfigured && status.platformAccountConfigured
}

function Pieza({ ok, label, nota }: { ok: boolean; label: string; nota?: string }) {
  return (
    <li className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      {/*
        El icono no va solo: lleva su palabra al lado. Un check verde y una equis roja
        distinguiéndose únicamente por el color dejan fuera a quien no los distingue
        (§7 — el color nunca es el único portador).
      */}
      {ok ? (
        <Check aria-hidden className="text-success-strong mt-0.5 size-4 shrink-0" />
      ) : (
        <X aria-hidden className="text-destructive-strong mt-0.5 size-4 shrink-0" />
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-sm">{label}</span>
        {nota && <span className="text-muted-foreground block text-xs">{nota}</span>}
      </span>
      <span className={ok ? 'text-success-strong text-sm' : 'text-destructive-strong text-sm'}>
        {ok ? 'Configurado' : 'Falta'}
      </span>
    </li>
  )
}

/** Un id que puede no estar. No es un fallo por sí solo: depende de cómo se desplegó. */
function Identificador({ label, valor }: { label: string; valor: string | null }) {
  return (
    <li className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <span className="min-w-0 flex-1 text-sm">{label}</span>
      <span className={valor ? 'nums text-sm' : 'text-muted-foreground text-sm'}>
        {valor || 'Sin definir'}
      </span>
    </li>
  )
}

const CUERPO_POR_DEFECTO = 'Prueba de WhatsApp desde Nummo.'

function EnvioDePrueba({ listo }: { listo: boolean }) {
  const [to, setTo] = useState('')
  const enviar = useSendPlatformTestMessage()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await enviar.mutateAsync({ data: { to, body: CUERPO_POR_DEFECTO } })
      /*
        **`202`, no `200`.** Meta lo aceptó para entregarlo, que no es lo mismo que
        entregado: prometer «enviado» aquí es exactamente la clase de mensaje que hace
        que alguien descarte el canal como culpable cuando sí lo era.
      */
      toast.success('Meta lo aceptó', {
        description: 'Aceptado para entrega. Si no llega, el problema está del lado de Meta.',
      })
    } catch (err) {
      toastApiError(err, 'No se pudo enviar')
    }
  }

  return (
    <Panel title="Mandar una prueba">
      {listo ? (
        <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
          <Field
            label="A qué número"
            htmlFor="wa-prueba"
            hint="Con indicativo. Sale desde la cuenta de plataforma, no desde la de ningún cliente."
          >
            <Input
              id="wa-prueba"
              className="w-56"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="+57 300 000 0000"
              required
              minLength={8}
              maxLength={25}
            />
          </Field>
          <Button type="submit" disabled={enviar.isPending || to.trim().length < 8}>
            <Send aria-hidden className="size-4" />
            Enviar
          </Button>
        </form>
      ) : (
        <Note tone="warning" title="Falta configurar el canal">
          Sin la pasarela y la cuenta de plataforma, un envío de prueba solo puede fallar por lo
          que ya dice la lista de arriba.
        </Note>
      )}
    </Panel>
  )
}
