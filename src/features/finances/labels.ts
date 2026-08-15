export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  PAYMENT: 'Pago',
  DISBURSEMENT: 'Egreso',
  TRANSFER_IN: 'Transferencia (entra)',
  TRANSFER_OUT: 'Transferencia (sale)',
  ADJUSTMENT: 'Ajuste',
  REVERSAL: 'Reversión',
}

export const DIRECTION_LABELS: Record<string, string> = {
  IN: 'Entrada',
  OUT: 'Salida',
}

export const MOVEMENT_TYPES = [
  'PAYMENT',
  'DISBURSEMENT',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'ADJUSTMENT',
  'REVERSAL',
] as const
