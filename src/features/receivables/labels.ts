import type { StatusTone } from '@/components/ui/status-badge'

export const RECEIVABLE_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  PARTIAL: 'Parcial',
  OVERDUE: 'Vencida',
  PAID: 'Pagada',
  CANCELLED: 'Cancelada',
  WRITTEN_OFF: 'Castigada',
}

export function receivableStatusTone(status: string): StatusTone {
  switch (status) {
    case 'PAID':
      return 'success'
    case 'PARTIAL':
      return 'warning'
    case 'OVERDUE':
      return 'destructive'
    default:
      return 'muted'
  }
}

/** Par tono/etiqueta listo para `<StatusBadge {...receivableStatus(s)} />`. */
export function receivableStatus(status: string): { tone: StatusTone; label: string } {
  return { tone: receivableStatusTone(status), label: RECEIVABLE_STATUS_LABELS[status] ?? status }
}

export const ADJUSTMENT_TYPE_LABELS: Record<string, string> = {
  DISCOUNT: 'Descuento',
  INTEREST: 'Interés',
  MANUAL_ADD: 'Cargo manual',
  MANUAL_SUBTRACT: 'Abono manual',
  WAIVER: 'Condonación',
}

/** Solo estos tipos son creables desde el front (INTEREST/WAIVER los pone el motor de mora). */
export const CREATE_ADJUSTMENT_TYPES = ['DISCOUNT', 'MANUAL_ADD', 'MANUAL_SUBTRACT'] as const

