/** Un turno de la conversación con Numi, tal como se pinta en el hilo. */
export type ChatRole = 'user' | 'assistant'

/**
 * Vida de un mensaje del usuario.
 *
 * `queued` existe porque Numi atiende un turno a la vez: mientras contesta, lo que
 * escribas se queda esperando en el hilo en vez de perderse o de bloquear la caja.
 * Los mensajes de Numi no llevan estado — o llegan, o no llegan.
 */
export type ChatMessageStatus = 'queued' | 'sending' | 'sent' | 'failed'

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
  /** Solo en los mensajes propios; los del historial llegan ya entregados. */
  status?: ChatMessageStatus
  /**
   * Lo que opinaste de esta respuesta. Solo en las de Numi: puntuar lo que tú escribiste
   * no significa nada.
   */
  feedback?: ChatFeedback
}

/** Pulgar arriba o abajo. Sin valor = todavía no has dicho nada. */
export type ChatFeedback = 'up' | 'down'

/**
 * Por qué no salió el turno. El tipo decide qué ofrecerle al usuario, y sobre todo
 * **cuándo no ofrecerle reintentar**: volver a mandar lo mismo sin proveedor o sin
 * cuota falla igual, y un botón que no puede funcionar es peor que ninguno.
 *
 *   setup    → no hay proveedor de IA activo (422). Se arregla en Configuración.
 *   quota    → se acabó el tope del mes (409 LIMIT_EXCEEDED). Se arregla esperando o de plan.
 *   plan     → el plan no lo incluye (403 FEATURE_NOT_AVAILABLE).
 *   generic  → lo demás: red, servidor, lo que sea. Esto sí se reintenta.
 */
export type NumiErrorKind = 'setup' | 'quota' | 'plan' | 'generic'

export interface NumiQuota {
  /** Clave del tope tal cual la nombra el backend (`ai_messages_monthly`…). */
  limit: string
  max: number
  used: number
  /** `YYYY-MM` del periodo consumido; solo en los topes que se reinician. */
  period?: string
}

export interface NumiError {
  kind: NumiErrorKind
  message: string
  quota?: NumiQuota
}
