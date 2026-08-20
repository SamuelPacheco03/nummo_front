import { Banknote, ReceiptText, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { StatusTone } from '@/components/ui/status-badge'

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  POSTED: 'Registrado',
  REVERSED: 'Reversado',
}

export const PAYMENT_PURPOSE_LABELS: Record<string, string> = {
  RECEIVABLE: 'Abono a cuenta',
  ADVANCE: 'Anticipo',
  DIRECT_INCOME: 'Ingreso directo',
}

/**
 * El icono de la fila **según a dónde fue el dinero**.
 *
 * Lo que de verdad querría verse ahí es el concepto que se cobró, y el contrato
 * solo lo trae en los ingresos directos (§95.19): un pago aplicado a cartera
 * puede saldar cuentas de conceptos distintos y un anticipo no pertenece a
 * ninguno todavía. Ya que no se puede decir *de qué* es, se dice *qué es*, que
 * es lo que distingue una fila de otra en una lista donde todas eran el mismo
 * billete.
 */
export const PAYMENT_PURPOSE_ICONS: Record<string, LucideIcon> = {
  RECEIVABLE: ReceiptText,
  ADVANCE: Wallet,
  DIRECT_INCOME: Banknote,
}

/** Un pago reversado deja de contar: se apaga, no se marca en rojo. */
export function paymentStatus(status: string): { tone: StatusTone; label: string } {
  return {
    tone: status === 'REVERSED' ? 'muted' : 'success',
    label: PAYMENT_STATUS_LABELS[status] ?? status,
  }
}
