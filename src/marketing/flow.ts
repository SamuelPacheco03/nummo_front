import { MessageCircle, CheckCircle2, ReceiptText } from 'lucide-react'

/**
 * Los tres eventos del ciclo de cobro, contados una sola vez.
 *
 * Los enseñan dos superficies —la actividad reciente del panel del hero y los pasos
 * numerados de «Del movimiento a la acción»— con formas distintas y **el mismo texto**.
 * Vivían copiados en los dos archivos, y eso se pagó: la corrección de «Banco conectado»
 * (§97.18) hubo que hacerla dos veces, y la segunda solo porque alguien se acordó.
 *
 * Lo que cambia entre las dos es la presentación —una pinta pastillas de `RowIconBadge`,
 * la otra cuadros tintados con su número—, así que el icono viaja aquí y el color lo pone
 * cada una en su idioma.
 *
 * **Cada línea tiene que ser verdad** (§97.18). El recordatorio sale por WhatsApp antes y
 * después del vencimiento (`contract/HANDOFF-whatsapp-cobranza.md`), y el pago se registra
 * y se aplica a la factura con sus `allocations`. Nada de esto es aspiracional.
 */

export interface PasoDelFlujo {
  Icon: typeof ReceiptText
  titulo: string
  detalle: string
}

export const FLUJO: readonly PasoDelFlujo[] = [
  { Icon: ReceiptText, titulo: 'Cobro creado', detalle: 'Cliente · Mensualidad' },
  { Icon: MessageCircle, titulo: 'Recordatorio por WhatsApp', detalle: 'Automático · antes de vencer' },
  { Icon: CheckCircle2, titulo: 'Pago registrado', detalle: 'Aplicado a la factura' },
]
