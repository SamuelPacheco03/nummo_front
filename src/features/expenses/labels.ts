import type { StatusTone } from '@/components/ui/status-badge'

export const EXPENSE_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  PARTIAL: 'Parcial',
  OVERDUE: 'Vencido',
  PAID: 'Pagado',
  CANCELLED: 'Cancelado',
  WRITTEN_OFF: 'Castigado',
}

const SCHEDULE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activo',
  PAUSED: 'Pausado',
  ENDED: 'Finalizado',
  CANCELLED: 'Cancelado',
}

const DISBURSEMENT_STATUS_LABELS: Record<string, string> = {
  PENDING_APPROVAL: 'Espera aprobación',
  POSTED: 'Registrado',
  REJECTED: 'Rechazado',
  REVERSED: 'Reversado',
}

/**
 * Los cuatro tonos dicen cosas distintas y ninguno sobra: **esperando** es ámbar
 * porque pide una acción de alguien; **rechazado** es rojo porque el dinero no
 * salió y ya no va a salir; **reversado** se apaga, que es lo que se le hace a
 * algo que ocurrió y se deshizo; **registrado** es lo normal.
 *
 * Por encima del umbral no se mueve un peso hasta que alguien aprueba, así que
 * un pendiente **no es** un egreso a medias: es una solicitud.
 */
const DISBURSEMENT_STATUS_TONES: Record<string, StatusTone> = {
  PENDING_APPROVAL: 'warning',
  POSTED: 'success',
  REJECTED: 'destructive',
  REVERSED: 'muted',
}

export const DISBURSEMENT_PURPOSE_LABELS: Record<string, string> = {
  EXPENSE: 'Pago de gasto',
  ADVANCE: 'Anticipo',
  DIRECT_EXPENSE: 'Egreso directo',
}

export const RECURRENCE_LABELS: Record<string, string> = { MONTHLY: 'Mensual' }

function expenseStatusTone(status: string): StatusTone {
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

function scheduleStatusTone(status: string): StatusTone {
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

export function disbursementStatus(status: string): { tone: StatusTone; label: string } {
  return {
    tone: DISBURSEMENT_STATUS_TONES[status] ?? 'muted',
    label: DISBURSEMENT_STATUS_LABELS[status] ?? status,
  }
}
