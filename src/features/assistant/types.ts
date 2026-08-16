/** Un turno de la conversación con Numi, tal como se pinta en el hilo. */
export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  /** ISO-8601; la burbuja muestra la hora local. */
  at: string
}

/**
 * Fallo de un turno. `needsSetup` marca el caso de "aún no hay proveedor de IA
 * activo" (el backend responde 422), que se resuelve en Configuración y no
 * reintentando.
 */
export interface NumiError {
  message: string
  needsSetup: boolean
}
