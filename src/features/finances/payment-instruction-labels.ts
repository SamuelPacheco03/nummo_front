import { Banknote, CreditCard, KeyRound, Link2, Smartphone } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { PaymentInstructionKind } from '@/api/generated/model'

/**
 * Las cinco formas de cobrar, **con las palabras de quien llena el formulario**.
 *
 * Cobrar en Colombia no tiene una sola forma: a una cuenta se consigna con tipo y
 * número, a una llave se transfiere sin saber el número, a un Nequi basta el
 * celular, y a veces hay un enlace. Un «banco + número + link» dejaría fuera la
 * mitad de los casos reales, así que son cinco y cada una con sus campos.
 */
const KINDS: Record<PaymentInstructionKind, { label: string; hint: string; Icon: LucideIcon }> = {
  BANK_ACCOUNT: {
    label: 'Cuenta bancaria',
    hint: 'A la que se consigna o se transfiere.',
    Icon: Banknote,
  },
  TRANSFER_KEY: {
    label: 'Llave / Transfiya',
    hint: 'Se transfiere sin saber el número de cuenta.',
    Icon: KeyRound,
  },
  WALLET: {
    label: 'Billetera (Nequi, Daviplata…)',
    hint: 'Basta el celular.',
    Icon: Smartphone,
  },
  PAYMENT_LINK: { label: 'Enlace de pago', hint: 'Una pasarela propia.', Icon: Link2 },
  OTHER: { label: 'Otro', hint: 'Lo que no encaje en los anteriores.', Icon: CreditCard },
}

/** El orden del formulario: lo más usado primero. */
export const INSTRUCTION_KINDS: PaymentInstructionKind[] = [
  'BANK_ACCOUNT',
  'TRANSFER_KEY',
  'WALLET',
  'PAYMENT_LINK',
  'OTHER',
]

export function instructionKind(kind: PaymentInstructionKind): {
  label: string
  hint: string
  Icon: LucideIcon
} {
  return KINDS[kind] ?? { label: kind, hint: '', Icon: CreditCard }
}

/** Ahorros o corriente. **No es un adorno**: consignar a la que no es rebota. */
export const ACCOUNT_KINDS = [
  { value: 'SAVINGS', label: 'Ahorros' },
  { value: 'CHECKING', label: 'Corriente' },
] as const

/** Con qué se identifica una llave. */
export const KEY_KINDS = [
  { value: 'PHONE', label: 'Celular' },
  { value: 'EMAIL', label: 'Correo' },
  { value: 'DOCUMENT', label: 'Documento' },
  { value: 'ALPHANUMERIC', label: 'Alfanumérica' },
] as const

/**
 * **Cuántas caben en un recordatorio.**
 *
 * Con dos o tres el renglón se lee; con seis es un muro que nadie termina. El
 * backend se queda con las publicables por `sortOrder` y el resto no sale — y no
 * tiene dónde avisarlo, así que lo dice la pantalla.
 */
export const MAX_IN_REMINDERS = 3
