import type { StatusTone } from '@/components/ui/status-badge'

export const AGREEMENT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activo',
  PAUSED: 'Pausado',
  ENDED: 'Finalizado',
  CANCELLED: 'Cancelado',
}

export const RECURRENCE_LABELS: Record<string, string> = {
  MONTHLY: 'Mensual',
}

export const CALC_METHOD_LABELS: Record<string, string> = {
  DAILY_SIMPLE_PERCENT: 'Interés simple diario (%)',
  MONTHLY_SIMPLE_PRORATED: 'Mensual simple prorrateado',
  FIXED_ONCE: 'Cargo fijo único (%)',
  FIXED_AMOUNT: 'Monto fijo (en dinero)',
}

export const CALC_METHODS = [
  'DAILY_SIMPLE_PERCENT',
  'MONTHLY_SIMPLE_PRORATED',
  'FIXED_ONCE',
  'FIXED_AMOUNT',
] as const

export const BASE_TYPE_LABELS: Record<string, string> = {
  ORIGINAL_AMOUNT: 'Monto original',
  OUTSTANDING_NON_INTEREST: 'Saldo sin interés',
}

export const BASE_TYPES = ['ORIGINAL_AMOUNT', 'OUTSTANDING_NON_INTEREST'] as const

export function agreementStatusTone(status: string): StatusTone {
  if (status === 'ACTIVE') return 'success'
  if (status === 'PAUSED') return 'warning'
  return 'muted'
}

/** Par tono/etiqueta listo para `<StatusBadge {...agreementStatus(s)} />`. */
export function agreementStatus(status: string): { tone: StatusTone; label: string } {
  return { tone: agreementStatusTone(status), label: AGREEMENT_STATUS_LABELS[status] ?? status }
}
