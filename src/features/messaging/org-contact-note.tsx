import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Loader } from '@/components/ui/loader'
import { Note } from '@/components/ui/note'
import { useUpdateOrg } from '@/features/config/hooks'
import { toastApiError } from '@/features/platform/errors'

/**
 * **A dónde escribe el deudor**, pedido aquí mismo cuando falta.
 *
 * Los recordatorios salen de un número que **no recibe respuestas**: el de la
 * plataforma es compartido entre todos los clientes de Nummo, y si dos empresas
 * tienen al mismo deudor no hay forma de saber de quién es esa conversación. Por
 * eso el mensaje lleva un renglón que dice a dónde escribir de verdad, como el
 * «este número no recibe mensajes» de un banco.
 *
 * Sin teléfono ni correo, **encender la cobranza responde 422**. Se pide en línea
 * y no con un enlace a la ficha de la empresa: mandar a alguien a otra sección a
 * mitad de una configuración es perderlo, y lo que falta son dos campos.
 *
 * Pero **el dato es de la organización, no de la cobranza** —hoy es su único
 * consumidor y mañana no—, así que se dice dónde se guarda: quien lo escribe aquí
 * tiene que saber que lo está poniendo en la ficha de la empresa y no en un ajuste
 * de esta pantalla.
 *
 * Quien no pueda editar la organización sí ve el enlace: no hay nada que pueda
 * hacer aquí, y necesita saber a quién pedírselo.
 */
export function OrgContactNote({
  orgId,
  canManageOrg,
}: {
  orgId: string | undefined
  canManageOrg: boolean
}) {
  const update = useUpdateOrg(orgId ?? '')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  const onSave = async () => {
    if (!orgId) return
    /*
      Con uno basta, y lo comprueba el backend igual. Aquí se adelanta para no
      gastar una petición que ya se sabe que va a volver con un 422.
    */
    if (!phone.trim() && !email.trim()) {
      toast.error('Pon al menos un teléfono o un correo')
      return
    }
    try {
      await update.mutateAsync({
        orgId,
        // Vacío es «no lo pongo», que en el contrato es `null`.
        data: { contactPhone: phone.trim() || null, contactEmail: email.trim() || null },
      })
      toast.success('Datos de contacto guardados')
    } catch (err) {
      toastApiError(err, 'No se pudieron guardar')
    }
  }

  return (
    <Note tone="warning" title="Falta decirle al deudor a dónde escribirte">
      <p>
        Los recordatorios salen de un número que <strong>no recibe respuestas</strong>, así que
        el mensaje tiene que decir a dónde contestar. Sin esto, la cobranza no se puede
        encender.
      </p>

      {canManageOrg ? (
        <div className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Teléfono" htmlFor="org-phone">
              <Input
                id="org-phone"
                inputMode="tel"
                maxLength={40}
                placeholder="+57 310 594 8908"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </Field>
            <Field label="Correo" htmlFor="org-email">
              <Input
                id="org-email"
                type="email"
                maxLength={200}
                placeholder="cartera@miempresa.co"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
          </div>
          <div className="flex items-center gap-3">
            {/*
              `type="button"` a propósito: este bloque vive **dentro del formulario
              de la política**, y sin decirlo el botón la enviaría entera —que es
              justo la petición que el backend acaba de rechazar—.
            */}
            <Button type="button" size="sm" onClick={() => void onSave()} disabled={update.isPending}>
              {update.isPending && <Loader className="size-4" />}
              Guardar contacto
            </Button>
            <span className="text-muted-foreground text-xs">
              Con uno de los dos basta. Se guarda en la ficha de la empresa.
            </span>
          </div>
        </div>
      ) : (
        <p className="mt-2">
          Tu rol no incluye editar la organización: pídeselo a quien la administre.{' '}
          <Link to="/config/empresa" className="text-brand underline">
            Ficha de la empresa
          </Link>
        </p>
      )}
    </Note>
  )
}
