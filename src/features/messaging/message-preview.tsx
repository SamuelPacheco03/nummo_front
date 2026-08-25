import { MessageCircle } from 'lucide-react'
import type { WhatsAppTemplate } from '@/api/generated/model'
import { cn } from '@/lib/utils'
import { parameterLabel } from './labels'

/**
 * **Cómo le queda el mensaje a quien te debe.**
 *
 * La pieza que convierte esta pantalla de formulario en herramienta: hasta ahora
 * se configuraba a ciegas —eliges una plantilla por su nombre y no sabes qué le
 * llega a tu cliente hasta que le llega—.
 *
 * **No finge el texto exacto, y eso es deliberado.** El contrato publica de una
 * plantilla su `purpose` y sus `parameterNames`, pero **no su cuerpo**: el texto
 * lo aprueba Meta y no viaja. Inventarlo aquí sería peor que no enseñarlo — el
 * usuario confiaría en una vista previa que no es lo que sale.
 *
 * Lo que sí es exacto son **los dos renglones que se configuran en esta pantalla**:
 * el de dónde pagar, que compone el servidor a partir de las cuentas publicadas,
 * y el del contacto de la empresa. Son justo los que se degradan en silencio
 * —«Para pagar: comunícate con nosotros»— y los que nadie veía venir.
 */
export function MessagePreview({
  template,
  paymentLines,
  paymentLink,
  contact,
  when,
  className,
}: {
  /** La plantilla elegida, o `undefined` si ese aviso está sin plantilla. */
  template: WhatsAppTemplate | undefined
  /** Los renglones de pago **compuestos por el servidor**, tal cual. */
  paymentLines: string[]
  paymentLink: string
  contact: { phone: string | null; email: string | null }
  /** «3 días antes del vencimiento» — cuándo sale este aviso. */
  when: string
  className?: string
}) {
  const parts = (template?.parameterNames ?? []).filter((p) => p !== 'como_pagar' && p !== 'contacto')
  const contactValue = contact.phone || contact.email

  return (
    <div className={cn('overflow-hidden rounded-lg border', className)}>
      <div className="space-y-1 border-b p-4">
        <p className="text-sm font-medium">Así lo recibe</p>
        <p className="text-muted-foreground text-xs">{when}</p>
      </div>

      {/*
        Fondo de conversación, no del producto: lo que se está mirando es un
        WhatsApp, y pintarlo con los colores de Nummo lo haría parecer una
        pantalla más de la app en vez del mensaje que sale de ella.
      */}
      <div className="bg-[#eae6df] p-4 dark:bg-[#0b141a]">
        <div className="max-w-80 rounded-lg rounded-bl-xs bg-[#d9fdd3] p-3 shadow-xs dark:bg-[#005c4b]">
          {template ? (
            <p className="text-[13.5px] leading-relaxed text-[#111b21] italic dark:text-[#e9edef]">
              {template.purpose ?? template.displayName ?? template.name}
              {parts.length > 0 && <> Lleva {listar(parts.map(parameterLabel))}.</>}
            </p>
          ) : (
            <p className="text-[13.5px] leading-relaxed text-[#667781] italic dark:text-[#8696a0]">
              Sin plantilla, este aviso no sale.
            </p>
          )}

          <p className="mt-2 text-[13.5px] leading-relaxed text-[#111b21] dark:text-[#e9edef]">
            {paymentLines.length > 0 ? (
              <>Para pagar: {paymentLines.join('. También: ')}.</>
            ) : (
              /* Lo que de verdad sale cuando no hay ninguna cuenta publicada. */
              <>Para pagar: comunícate con nosotros.</>
            )}
            {paymentLink && <> O en {paymentLink.replace(/^https:\/\//, '')}</>}
          </p>

          <p className="mt-2 text-[13.5px] leading-relaxed text-[#111b21] dark:text-[#e9edef]">
            Si ya pagaste, ignora este mensaje.
            {contactValue ? <> Cualquier duda, escríbenos al {contactValue}.</> : null}
          </p>
        </div>
      </div>

      <div className="text-muted-foreground flex gap-2.5 border-t p-4 text-xs">
        <MessageCircle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        <p>
          <strong className="text-foreground font-medium">El primer renglón lo pone la plantilla</strong>{' '}
          y su texto exacto lo aprueba Meta. Los otros dos los armas tú aquí, y son los que se ven
          arriba tal como van a salir.
        </p>
      </div>
    </div>
  )
}

/** «su nombre, el monto y los días» — una lista en castellano. */
function listar(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? ''
  return `${parts.slice(0, -1).join(', ')} y ${parts.at(-1)}`
}
