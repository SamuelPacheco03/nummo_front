/**
 * Tope del contrato para `AssistantChatInput.message` (ver `contract/openapi.json`).
 * El backend rechaza mensajes más largos, así que el composer corta antes.
 */
export const MAX_MESSAGE_LENGTH = 4000

/** Alto máximo del textarea antes de hacer scroll interno (px). */
export const COMPOSER_MAX_HEIGHT = 120

/** Arranques sugeridos del estado vacío: consulta, informe y registro. */
export const SUGGESTIONS: readonly string[] = [
  '¿Cuánto me deben este mes?',
  'Muéstrame el flujo de caja de esta semana',
  'Registra un abono de un cliente',
  '¿Quiénes son mis mayores deudores?',
]
