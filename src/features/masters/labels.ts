export const METHOD_TYPE_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  BANK_TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
  DIGITAL_WALLET: 'Billetera digital',
  OTHER: 'Otro',
}

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  CASH: 'Caja',
  BANK: 'Banco',
  DIGITAL_WALLET: 'Billetera digital',
  OTHER: 'Otro',
}

export const METHOD_TYPES = ['CASH', 'BANK_TRANSFER', 'CARD', 'DIGITAL_WALLET', 'OTHER'] as const
export const ACCOUNT_TYPES = ['CASH', 'BANK', 'DIGITAL_WALLET', 'OTHER'] as const

const AMOUNT_RE = /^-?\d+(\.\d{1,2})?$/
export function isValidAmount(v: string | undefined): boolean {
  return !v || AMOUNT_RE.test(v)
}
