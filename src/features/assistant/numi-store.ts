import { create } from 'zustand'
import type { ChatMessage, ChatRole, NumiError } from './types'

/**
 * Estado del panel de Numi.
 *
 * Zustand y no TanStack Query a propósito: el backend NO expone historial de
 * conversación (la memoria vive en Redis, ~3 turnos, y solo se referencia por
 * `sessionId`). El hilo que se ve en pantalla es estado de cliente puro; lo
 * único "de servidor" es el `sessionId`, que se reenvía en cada mensaje.
 *
 * No se persiste: al recargar, la memoria del servidor ya puede haber expirado
 * y mostrar un hilo viejo con un asistente que no lo recuerda confunde más de
 * lo que ayuda.
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

  open: () => void
  close: () => void
  appendMessage: (role: ChatRole, content: string) => void
  /** Guarda la respuesta y el `sessionId` con el que continuar. */
  appendReply: (sessionId: string, reply: string) => void
  setError: (error: NumiError | null) => void
  /** Empieza de cero: olvida el hilo del servidor y limpia la vista. */
  newConversation: () => void
  /** Ata el hilo a una organización; si cambia, la conversación se reinicia. */
  switchOrg: (orgId: string) => void
}

const EMPTY = { sessionId: undefined, messages: [] as ChatMessage[], error: null as NumiError | null }

export const useNumiStore = create<NumiState>()((set) => ({
  isOpen: false,
  orgId: null,
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

  newConversation: () => set({ ...EMPTY }),

  switchOrg: (orgId) => set((s) => (s.orgId === orgId ? s : { orgId, ...EMPTY })),
}))
