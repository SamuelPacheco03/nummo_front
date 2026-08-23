/**
 * Tope del contrato para `AssistantChatInput.message` (ver `contract/openapi.json`).
 * El backend rechaza mensajes más largos, así que el composer corta antes.
 */
export const MAX_MESSAGE_LENGTH = 4000

/** Lo que aguanta el título de una conversación en el servidor (`RenameConversationInput`). */
export const MAX_CONVERSATION_TITLE = 200

/**
 * Lo que acepta `POST /assistant/chat/image` por defecto (`DOCUMENTS_MAX_MB`).
 *
 * Se comprueba en el cliente porque una foto de un móvil moderno se pasa sin
 * esfuerzo, y descubrirlo después de subir diez megas por la red del celular es
 * la peor forma de enterarse.
 */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024

/** Los cuatro que lee el backend. No hay PDF: el `CHECK` de la tabla lo sostiene. */
export const IMAGE_TYPES = 'image/jpeg,image/png,image/webp,image/gif'

/** Alto máximo del textarea antes de hacer scroll interno (px). */
export const COMPOSER_MAX_HEIGHT = 120

/** Arranques sugeridos del estado vacío: consulta, informe y registro. */
export const SUGGESTIONS: readonly string[] = [
  '¿Cuánto me deben este mes?',
  'Muéstrame el flujo de caja de esta semana',
  'Registra un abono de un cliente',
  '¿Quiénes son mis mayores deudores?',
]
