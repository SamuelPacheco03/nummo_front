export const EXPENSE_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  PARTIAL: 'Parcial',
  OVERDUE: 'Vencido',
  PAID: 'Pagado',
  CANCELLED: 'Cancelado',
  WRITTEN_OFF: 'Castigado',
}

export const SCHEDULE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activo',
  PAUSED: 'Pausado',
  ENDED: 'Finalizado',
  CANCELLED: 'Cancelado',
}

export const DISBURSEMENT_STATUS_LABELS: Record<string, string> = {
  POSTED: 'Registrado',
  REVERSED: 'Reversado',
}

export const DISBURSEMENT_PURPOSE_LABELS: Record<string, string> = {
  EXPENSE: 'Pago de gasto',
  ADVANCE: 'Anticipo',
  DIRECT_EXPENSE: 'Egreso directo',
}

export const RECURRENCE_LABELS: Record<string, string> = { MONTHLY: 'Mensual' }

export type StatusTone = 'success' | 'warning' | 'destructive' | 'muted'

export function expenseStatusTone(status: string): StatusTone {
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

export function scheduleStatusTone(status: string): StatusTone {
  if (status === 'ACTIVE') return 'success'
  if (status === 'PAUSED') return 'warning'
  return 'muted'
}

export const TONE_DOT: Record<StatusTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  muted: 'bg-muted-foreground/40',
}
