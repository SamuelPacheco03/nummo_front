/** Un turno de la conversación con Numi, tal como se pinta en el hilo. */
export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  /** ISO-8601; la burbuja muestra la hora local. */
  at: string
  /**
   * Nota de voz recién grabada: URL local (blob), reproducible al instante y
   * sin pedirle nada al servidor. Solo existe para los audios de esta sesión.
   */
  audioUrl?: string
  /**
   * El mensaje se dictó. Sobrevive a la recarga (`source: 'audio'` del
   * contrato) aunque su audio ya no esté guardado.
   */
  dictated?: boolean
  /**
   * El backend conserva el audio y puede firmar una URL para reproducirlo
   * (`hasAudio` del contrato). Se pide **al darle a play**, no antes: la URL
   * caduca y pedir una por mensaje al abrir el hilo sería una ráfaga inútil.
   */
  hasAudio?: boolean
  /**
   * Subidas y bajadas de la voz, de 0 a 1. Se calcula al grabar y el servidor
   * la guarda con el mensaje, así que el historial dibuja la nota **sin
   * descargar el audio**. Sin ella, la onda sale plana hasta que se reproduce.
   */
  waveform?: number[]
  /** Duración en segundos, para enseñarla antes de reproducir nada. */
  audioSeconds?: number
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
