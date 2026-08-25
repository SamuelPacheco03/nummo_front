import { type ReactNode } from 'react'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatDateHuman } from '@/lib/format'
import type { WhatsAppTemplate } from '@/api/generated/model'
import { parameterLabel, templateStatus } from './labels'

/**
 * **Una plantilla, como tarjeta.**
 *
 * La enseñan dos pantallas —la del inquilino (`/config/plantillas`) y la de la
 * consola (§47.6)— y eran dos filas calcadas: el mismo título, la misma línea de
 * clave, los mismos parámetros y el mismo estado a la derecha. Son las mismas
 * plantillas mirando desde el otro lado, así que van por el mismo sitio que su
 * traducción (`labels.ts`) en vez de por dos archivos que se separan a la primera
 * corrección.
 *
 * **Tarjeta y no renglón**, y el motivo se ve en un teléfono: una fila que reparte
 * nombre, clave, propósito, parámetros, estado y fecha entre dos columnas que a
 * 360 px no caben acaba envolviendo por donde puede, y lo que queda es un párrafo
 * con trozos de seis datos distintos. La tarjeta le da a cada uno su renglón y
 * pone el borde donde termina una plantilla y empieza la siguiente. En escritorio
 * gana lo mismo por otra razón: cinco plantillas separadas por una línea de un
 * píxel se leen como una tabla sin cabecera.
 *
 * Lo que cambia entre las dos pantallas viaja como props, que son tres: el tercer
 * dato de la línea de clave, el aviso bajo el estado y los botones.
 */
export function TemplateCard({
  template,
  label,
  warning,
  actions,
}: {
  template: WhatsAppTemplate
  /**
   * El tercer dato de la línea de clave: la categoría **nuestra** en la pantalla
   * del inquilino, la de Meta en la consola. Son preguntas distintas y cada
   * pantalla pone la suya.
   */
  label?: string
  /** Bajo el estado. La consola dice ahí cuándo una plantilla no puede enviar. */
  warning?: ReactNode
  /** Los botones de la tarjeta. La consola no tiene: mira, no toca. */
  actions?: ReactNode
}) {
  const status = templateStatus(template)
  /*
    `displayName` primero: `name` es como se llama la plantilla **en Meta**
    —`cobro_vencido`— y titular con eso una lista en español no dice nada. La
    clave sigue debajo, que es lo que se busca al cotejar con Meta.
  */
  const name = template.displayName ?? template.name

  return (
    /*
      `min-w-0` en la tarjeta, no solo dentro: como celda de la rejilla su ancho
      mínimo es `auto` —el de su contenido—, así que la clave larga de una
      plantilla ensancha la celda por encima del panel y `truncate` no llega a
      recortar nada. Se ve a 360 px como una tarjeta cortada por la derecha.
    */
    <li className="bg-muted/40 min-w-0 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-3">
        {/*
          `flex-1` además de `min-w-0`: sin él la columna del nombre se mide por
          su texto —la clave de una plantilla es larga—, empuja al estado fuera de
          la tarjeta y `truncate` no recorta nada porque no hay ancho que
          respetar. A 360 px eso se ve como una tarjeta cortada por la derecha.
        */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{name}</p>
          {/*
            **Solo la clave se recorta.** Es un identificador —se coteja con Meta
            y se reconoce por el principio—, así que un «cobro_por_vencer_resu…»
            sigue sirviendo. El idioma y la categoría son palabras enteras o no
            son nada, y en un teléfono eran justo las que se perdían.
          */}
          <p className="text-muted-foreground mt-0.5 flex items-baseline gap-1 text-xs">
            <span className="truncate">{template.templateKey}</span>
            <span className="shrink-0">
              · {template.language}
              {label && ` · ${label}`}
            </span>
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          {/* `canSend` viene calculado; no se deduce del `status`. */}
          <StatusBadge {...status} />
          {warning}
        </div>
      </div>

      {template.purpose && (
        <p className="text-muted-foreground mt-2 text-xs">{template.purpose}</p>
      )}

      {template.parameterNames.length > 0 && (
        <p className="text-muted-foreground mt-1 text-xs">
          Usa: {template.parameterNames.map(parameterLabel).join(', ')}
        </p>
      )}

      {/* Meta dice por qué la rechazó; esconderlo deja la tarjeta sin salida. */}
      {template.rejectedReason && (
        <p className="text-destructive mt-1 text-xs">{template.rejectedReason}</p>
      )}

      {/*
        El pie solo existe si tiene algo que poner. Una regla y un espacio en
        blanco bajo una plantilla que nunca se ha contrastado y que no se puede
        tocar es una tarjeta que parece recortada.
      */}
      {(template.lastSyncedAt || actions) && (
        <div className="mt-2.5 flex items-center justify-between gap-3 border-t pt-2.5">
          <span className="text-muted-foreground text-xs">
            {/* Sin artículo: `formatDateHuman` ya trae el suyo cuando toca. */}
            {template.lastSyncedAt ? `Contrastada ${formatDateHuman(template.lastSyncedAt)}` : ''}
          </span>
          {actions && <div className="flex shrink-0 gap-1">{actions}</div>}
        </div>
      )}
    </li>
  )
}
