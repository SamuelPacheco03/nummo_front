import { create } from 'zustand'
import type { ChatMessage, ChatRole, NumiError } from './types'

/**
 * Estado del panel de Numi.
 *
 * El hilo visible es estado de cliente, pero el backend SÍ persiste las
 * conversaciones (list + messages, referenciadas por `sessionId`). Al abrir el
 * panel, `useNumiChat` lo hidrata con la conversación más reciente; a partir de
 * ahí los envíos se agregan de forma optimista y `sessionId` la continúa.
 */

let seq = 0
const nextId = (): string => `numi-${++seq}`

function message(role: ChatRole, content: string): ChatMessage {
  return { id: nextId(), role, content, at: new Date().toISOString() }
}

interface NumiState {
  /** Panel abierto (estado de UI). */
  isOpen: boolean
  /** Organización dueña del hilo: la conversación habla de SUS datos. */
  orgId: string | null
  /** Hilo del backend; se reenvía para continuar la conversación. */
  sessionId: string | undefined
  messages: ChatMessage[]
  /** Último fallo de envío; se muestra bajo el hilo con opción de reintentar. */
  error: NumiError | null
  /** Ya se intentó cargar el historial persistido (evita recargarlo en bucle). */
  hydrated: boolean

  open: () => void
  close: () => void
  appendMessage: (role: ChatRole, content: string) => void
  /** Guarda la respuesta y el `sessionId` con el que continuar. */
  appendReply: (sessionId: string, reply: string) => void
  setError: (error: NumiError | null) => void
  /** Siembra el hilo con la conversación persistida más reciente (una sola vez). */
  hydrate: (sessionId: string | undefined, messages: ChatMessage[]) => void
  /** Empieza de cero: olvida el hilo del servidor y limpia la vista. */
  newConversation: () => void
  /** Ata el hilo a una organización; si cambia, la conversación se reinicia. */
  switchOrg: (orgId: string) => void
}

const EMPTY = { sessionId: undefined, messages: [] as ChatMessage[], error: null as NumiError | null }

export const useNumiStore = create<NumiState>()((set) => ({
  isOpen: false,
  orgId: null,
  hydrated: false,
  ...EMPTY,

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),

  appendMessage: (role, content) =>
    set((s) => ({ messages: [...s.messages, message(role, content)] })),

  appendReply: (sessionId, reply) =>
    set((s) => ({
      sessionId,
      messages: [...s.messages, message('assistant', reply)],
      error: null,
    })),

  setError: (error) => set({ error }),

  hydrate: (sessionId, messages) =>
    set((s) => {
      if (s.hydrated) return s
      // Si el usuario ya empezó a escribir antes de que llegara el historial,
      // se respeta su hilo nuevo y solo se marca como hidratado.
      if (s.messages.length > 0) return { hydrated: true }
      return { hydrated: true, sessionId, messages }
    }),

  // Hilo limpio, pero marcado como hidratado para no recargar la conversación
  // que el usuario acaba de dejar.
  newConversation: () => set({ ...EMPTY, hydrated: true }),

  // Cambiar de organización reinicia el hilo y vuelve a hidratar con las
  // conversaciones de la nueva empresa.
  switchOrg: (orgId) => set((s) => (s.orgId === orgId ? s : { orgId, ...EMPTY, hydrated: false })),
}))
