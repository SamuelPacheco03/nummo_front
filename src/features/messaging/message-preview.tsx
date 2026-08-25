import { useState } from 'react'
import { ChevronDown, MessageCircle } from 'lucide-react'
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
  tabs,
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
  /** Los cuatro avisos, para poder mirar cualquiera sin salir de aquí. */
  tabs: { label: string; active: boolean; onSelect: () => void }[]
  className?: string
}) {
  const [abierta, setAbierta] = useState(false)
  const parts = (template?.parameterNames ?? []).filter((p) => p !== 'como_pagar' && p !== 'contacto')
  const contactValue = contact.phone || contact.email

  /*
    **Plegada en un teléfono, siempre abierta cuando hay sitio.** Es lo primero
    que se quiere ver, pero mide media pantalla: dejarla desplegada obligaba a
    bajar tres pantallas de maqueta antes de llegar al primer control.

    El estado solo manda por debajo de `@md`; a partir de ahí el CSS la abre y el
    botón desaparece, así que no hay forma de esconderla donde no estorba.
  */
  return (
    <div className={cn('overflow-hidden rounded-lg border', className)}>
      <button
        type="button"
        aria-expanded={abierta}
        onClick={() => setAbierta((v) => !v)}
        className="@md:hidden flex w-full items-center gap-3 p-4 text-left"
      >
        <Cabecera when={when} />
        <ChevronDown
          aria-hidden
          className={cn(
            'text-muted-foreground size-4 shrink-0 transition-transform',
            abierta && 'rotate-180',
          )}
        />
      </button>
      <div className="@md:block hidden p-4">
        <Cabecera when={when} />
      </div>

      <div className={cn('@md:block', abierta ? 'block' : 'hidden')}>
        {/*
          Dentro y no encima: cerrada, cuatro pastillas flotando sobre un panel
          plegado no eligen nada y en un teléfono se parten en dos filas.
        */}
        <div role="tablist" aria-label="Qué aviso se está viendo" className="flex flex-wrap gap-1.5 px-4 pb-3">
          {tabs.map((tab) => (
            <button
              key={tab.label}
              type="button"
              role="tab"
              aria-selected={tab.active}
              onClick={tab.onSelect}
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs transition-colors',
                tab.active
                  ? 'bg-primary text-primary-foreground border-transparent font-medium'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
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
            <strong className="text-foreground font-medium">
              El primer renglón lo pone la plantilla
            </strong>{' '}
            y su texto exacto lo aprueba Meta. Los otros dos los armas tú aquí.
          </p>
        </div>
      </div>
    </div>
  )
}

function Cabecera({ when }: { when: string }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-medium">Así lo recibe</span>
      <span className="text-muted-foreground block text-xs">{when}</span>
    </span>
  )
}

/** «su nombre, el monto y los días» — una lista en castellano. */
function listar(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? ''
  return `${parts.slice(0, -1).join(', ')} y ${parts.at(-1)}`
}
