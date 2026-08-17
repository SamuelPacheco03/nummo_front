import type { StatusTone } from '@/components/ui/status-badge'

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

/** Pares tono/etiqueta listos para `<StatusBadge {...expenseStatus(s)} />`. */
export function expenseStatus(status: string): { tone: StatusTone; label: string } {
  return { tone: expenseStatusTone(status), label: EXPENSE_STATUS_LABELS[status] ?? status }
}

export function scheduleStatus(status: string): { tone: StatusTone; label: string } {
  return { tone: scheduleStatusTone(status), label: SCHEDULE_STATUS_LABELS[status] ?? status }
}

/** Un egreso reversado deja de contar: se apaga, no se marca en rojo. */
export function disbursementStatus(status: string): { tone: StatusTone; label: string } {
  return {
    tone: status === 'REVERSED' ? 'muted' : 'success',
    label: DISBURSEMENT_STATUS_LABELS[status] ?? status,
  }
}
