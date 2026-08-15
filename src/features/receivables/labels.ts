export const RECEIVABLE_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  PARTIAL: 'Parcial',
  OVERDUE: 'Vencida',
  PAID: 'Pagada',
  CANCELLED: 'Cancelada',
  WRITTEN_OFF: 'Castigada',
}

export type StatusTone = 'success' | 'warning' | 'destructive' | 'muted'

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

export const TONE_DOT: Record<StatusTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  muted: 'bg-muted-foreground/40',
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

/** Un ajuste que resta al saldo (para mostrar el signo). */
export function isNegativeAdjustment(type: string): boolean {
  return type === 'DISCOUNT' || type === 'MANUAL_SUBTRACT' || type === 'WAIVER'
}
