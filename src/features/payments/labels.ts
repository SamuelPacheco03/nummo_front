import type { StatusTone } from '@/components/ui/status-badge'

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  POSTED: 'Registrado',
  REVERSED: 'Reversado',
}

export const PAYMENT_PURPOSE_LABELS: Record<string, string> = {
  RECEIVABLE: 'Abono a cuenta',
  ADVANCE: 'Anticipo',
  DIRECT_INCOME: 'Ingreso directo',
}

/** Un pago reversado deja de contar: se apaga, no se marca en rojo. */
export function paymentStatus(status: string): { tone: StatusTone; label: string } {
  return {
    tone: status === 'REVERSED' ? 'muted' : 'success',
    label: PAYMENT_STATUS_LABELS[status] ?? status,
  }
}
