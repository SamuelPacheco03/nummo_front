import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChatMessage, ChatRole, NumiError } from './types'

/**
 * Estado del panel de Numi.
 *
 * El hilo visible es estado de cliente, pero el backend SÍ persiste las
 * conversaciones (list + messages, referenciadas por `sessionId`). Al abrir el
 * panel, `useNumiChat` lo hidrata con la conversación más reciente; a partir de
 * ahí los envíos se agregan de forma optimista y `sessionId` la continúa.
 *
 * **Y el hilo se guarda también aquí**, en el navegador. Cerrar el panel nunca
 * lo perdió —vive fuera del árbol de rutas—, pero en el móvil salir de la app
 * sí: el sistema descarta la página y al volver se entraba a un saludo, con lo
 * dicho hace un minuto en ninguna parte. El servidor conserva la conversación,
 * pero eso solo sirve si le dio tiempo a guardarla: si la respuesta iba en
 * camino cuando la app se fue, lo enviado no estaba en ningún sitio. Guardarlo
 * aquí cuesta unos kilobytes y hace que volver sea volver.
 */

/**
 * Cuántos mensajes se guardan del hilo.
 *
 * Lo que se quiere al volver es el final de la conversación, no su archivo: eso
 * lo tiene el servidor. Cincuenta mensajes son varias pantallas de hilo y unos
 * pocos kilobytes, y ponen un techo a lo que puede crecer en el navegador.
 */
const KEPT = 50

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
  /** Numi contestó con el chat cerrado y todavía no se ha visto. */
  unread: boolean
  /** Hay un turno en marcha: el hilo muestra «escribiendo…». */
  pending: boolean

  open: () => void
  close: () => void
  appendMessage: (role: ChatRole, content: string) => void
  /** Añade una nota de voz del usuario (audio local); la transcripción llega luego. */
  appendAudio: (audio: { audioUrl: string; waveform?: number[]; audioSeconds?: number }) => void
  /** Rellena la transcripción de una nota de voz cuando el backend responde. */
  setTranscript: (id: string, transcript: string) => void
  /** Pinta la onda de una nota en cuanto se termina de decodificar. */
  setWaveform: (id: string, waveform: number[], audioSeconds?: number) => void
  /** Guarda la respuesta y el `sessionId` con el que continuar. */
  appendReply: (sessionId: string, reply: string) => void
  setError: (error: NumiError | null) => void
  /** Siembra el hilo con la conversación persistida más reciente (una sola vez). */
  hydrate: (sessionId: string | undefined, messages: ChatMessage[]) => void
  /** Empieza de cero: olvida el hilo del servidor y limpia la vista. */
  newConversation: () => void
  /** Ata el hilo a una organización; si cambia, la conversación se reinicia. */
  switchOrg: (orgId: string) => void
  setPending: (pending: boolean) => void
}

/**
 * Lo que se guarda de un mensaje.
 *
 * La `audioUrl` de una nota recién grabada es un `blob:` de esta página y muere
 * con ella, así que guardarla dejaría un reproductor que no suena. Se queda el
 * resto —la transcripción y la onda—, que es lo que hace que la nota siga
 * siendo legible al volver.
 */
function storable(message: ChatMessage): ChatMessage {
  const { audioUrl: _audioUrl, ...rest } = message
  return rest
}

const EMPTY = { sessionId: undefined, messages: [] as ChatMessage[], error: null as NumiError | null }

export const useNumiStore = create<NumiState>()(
  persist(
    (set) => ({
      isOpen: false,
      orgId: null,
      hydrated: false,
      unread: false,
      pending: false,
      ...EMPTY,

      // Abrir es haber visto lo que hubiera pendiente.
      open: () => set({ isOpen: true, unread: false }),
      close: () => set({ isOpen: false }),

      appendMessage: (role, content) =>
        set((s) => ({ messages: [...s.messages, message(role, content)] })),

      appendAudio: (audio) =>
        set((s) => ({
          messages: [
            ...s.messages,
            { id: nextId(), role: 'user', content: '', at: new Date().toISOString(), dictated: true, ...audio },
          ],
        })),

      setTranscript: (id, transcript) =>
        set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, content: transcript } : m)) })),

      setWaveform: (id, waveform, audioSeconds) =>
        set((s) => ({
          messages: s.messages.map((m) => (m.id === id ? { ...m, waveform, audioSeconds } : m)),
        })),

      appendReply: (sessionId, reply) =>
        set((s) => ({
          sessionId,
          messages: [...s.messages, message('assistant', reply)],
          error: null,
          // Con el chat cerrado la respuesta no se ha visto: el icono lo dice.
          unread: !s.isOpen,
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
      newConversation: () => set({ ...EMPTY, hydrated: true, unread: false }),

      // Cambiar de organización reinicia el hilo y vuelve a hidratar con las
      // conversaciones de la nueva empresa.
      switchOrg: (orgId) =>
        set((s) => (s.orgId === orgId ? s : { orgId, ...EMPTY, hydrated: false, unread: false })),

      setPending: (pending) => set({ pending }),
    }),
    {
      name: 'nummo-numi',
      // `hydrated` no se guarda a propósito: al volver se vuelve a mirar el
      // servidor, y `hydrate` respeta el hilo local si ya hay algo escrito.
      partialize: (s) => ({
        orgId: s.orgId,
        sessionId: s.sessionId,
        messages: s.messages.slice(-KEPT).map(storable),
        unread: s.unread,
      }),
      // Los `id` son un contador: sin esto el primer mensaje nuevo reestrenaría
      // `numi-1` y chocaría con el que se acaba de recuperar.
      onRehydrateStorage: () => (state) => {
        seq = state?.messages.length ?? 0
      },
    },
  ),
)
