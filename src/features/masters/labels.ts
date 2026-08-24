/*
  Cuatro y no cinco: **pagar desde un Nequi es una transferencia**. La billetera
  es *dónde está* la plata —eso sigue siendo un tipo de cuenta, ahí abajo— y no
  *cómo se movió*. Los métodos que ya existían con ese tipo los reclasificó el
  backend a `BANK_TRANSFER`, así que aquí tampoco se le guarda el sitio: un
  rótulo para un valor que ya nadie emite es una invitación a volver a ofrecerlo.

  Va sobre `string` a propósito. Si aun así llegara un tipo que esta tabla no
  conoce, se enseña crudo —feo pero honesto— en vez de desaparecer.
*/
export const METHOD_TYPE_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  BANK_TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
  OTHER: 'Otro',
}

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  CASH: 'Caja',
  BANK: 'Banco',
  DIGITAL_WALLET: 'Billetera digital',
  OTHER: 'Otro',
}

export const METHOD_TYPES = ['CASH', 'BANK_TRANSFER', 'CARD', 'OTHER'] as const
export const ACCOUNT_TYPES = ['CASH', 'BANK', 'DIGITAL_WALLET', 'OTHER'] as const

/**
 * **Ahorros o corriente**, y no es un detalle: consignar a la que no es rebota, y
 * el deudor se entera dos días después de que su plata volvió.
 */
export const BANK_ACCOUNT_KINDS = [
  { value: 'SAVINGS', label: 'Ahorros' },
  { value: 'CHECKING', label: 'Corriente' },
] as const

/**
 * Con qué se identifica una llave de transferencia.
 *
 * La llave **no es un destino aparte**: es un alias *a* esta cuenta, así que son
 * dos campos suyos y no una fila propia. Tenerla suelta permitía que el alias y
 * la cuenta a la que apunta contaran cosas distintas.
 */
export const TRANSFER_KEY_KINDS = [
  { value: 'PHONE', label: 'Celular' },
  { value: 'EMAIL', label: 'Correo' },
  { value: 'DOCUMENT', label: 'Documento' },
  { value: 'ALPHANUMERIC', label: 'Alfanumérica' },
] as const

const AMOUNT_RE = /^-?\d+(\.\d{1,2})?$/
export function isValidAmount(v: string | undefined): boolean {
  return !v || AMOUNT_RE.test(v)
}
