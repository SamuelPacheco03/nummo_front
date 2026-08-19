import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChatFeedback, ChatMessage, ChatMessageStatus, ChatRole, NumiError } from './types'

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

/** Prefijo de los ids que inventa el cliente mientras el servidor no ha dado el suyo. */
const LOCAL_PREFIX = 'numi-'

/** Los del servidor son UUID; los de aquí, nunca. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * ¿Este id lo puso el servidor?
 *
 * Se pregunta por la forma y no por «no lleva el prefijo del cliente», que es la versión
 * fácil y la que falla: cualquier id que no encaje en ninguno de los dos moldes —uno viejo
 * del almacenamiento, uno de un test— se daría por bueno y se le pediría al servidor «qué
 * hay después de esto», que responde con todo lo que ya se tenía. Ante la duda, no
 * preguntar.
 */
export const isServerId = (id: string): boolean => UUID.test(id)

let seq = 0
const nextId = (): string => `${LOCAL_PREFIX}${++seq}`

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
  /**
   * Conversación cuya historia vive en el servidor y se puede seguir hacia atrás.
   *
   * No es lo mismo que `sessionId`: una conversación empezada en esta pantalla ya
   * tiene id en cuanto Numi contesta, pero todo lo suyo está a la vista y no hay
   * nada que ir a buscar. Distinguirlas es lo que evita pedir una página que no
   * existe cada vez que alguien estrena conversación.
   */
  historyId: string | null
  /**
   * El mensaje por el que se abrió la conversación, cuando se llegó desde una búsqueda.
   *
   * Sin esto, subir en el hilo pediría la página más nueva en vez de continuar hacia
   * atrás desde donde el usuario está leyendo: se vería un salto al final del historial.
   */
  historyUntil: string | null
  /** Numi contestó con el chat cerrado y todavía no se ha visto. */
  unread: boolean
  /** Hay un turno en marcha: el hilo muestra «escribiendo…». */
  pending: boolean
  /**
   * Con qué se corta el turno en vuelo. Vive aquí y no en el panel por lo mismo que
   * `pending`: cerrar el chat desmonta la vista y el turno sigue llegando, así que el
   * botón de detener tiene que poder alcanzarlo después. No se guarda —un
   * `AbortController` no sobrevive a la recarga, y el turno tampoco.
   */
  turn: AbortController | null

  open: () => void
  close: () => void
  appendMessage: (role: ChatRole, content: string) => void
  /**
   * Pone un mensaje propio en la cola y devuelve su id.
   *
   * Escribir no espera a que Numi termine: el mensaje entra al hilo marcado y sale
   * en cuanto haya turno libre. Antes la caja se quedaba muda y lo escrito se perdía.
   */
  enqueueMessage: (content: string) => string
  setMessageStatus: (id: string, status: ChatMessageStatus) => void
  /**
   * Cambia el id inventado por el cliente por el que el servidor le puso.
   *
   * Es lo que hace que un mensaje recién enviado y el mismo mensaje traído del servidor
   * sean uno solo. Sin esto, cualquier novedad que llegue —de otro dispositivo o al
   * reconectar— lo pintaría dos veces.
   */
  adoptServerId: (localId: string, serverId: string) => void
  /**
   * Añade por el final lo que se dijo en otro sitio. Gemela de `prependOlder`: aquella
   * trae historia, esta trae novedades.
   */
  appendNewer: (messages: ChatMessage[]) => void
  /** Pinta el pulgar en el acto; la petición solo lo confirma después. */
  setFeedback: (id: string, feedback: ChatFeedback | undefined) => void
  /** Añade una nota de voz del usuario (audio local); la transcripción llega luego. */
  appendAudio: (audio: { audioUrl: string; waveform?: number[]; audioSeconds?: number }) => void
  /**
   * Añade historia por arriba: lo que el servidor tenía antes de lo que ya se ve.
   * Es la otra mitad del hilo — `hydrate` siembra el final y esto trae lo anterior.
   */
  prependOlder: (messages: ChatMessage[]) => void
  /** Rellena la transcripción de una nota de voz cuando el backend responde. */
  setTranscript: (id: string, transcript: string) => void
  /** Pinta la onda de una nota en cuanto se termina de decodificar. */
  setWaveform: (id: string, waveform: number[], audioSeconds?: number) => void
  /** Guarda la respuesta y el `sessionId` con el que continuar. */
  appendReply: (sessionId: string, reply: string) => void
  /**
   * Abre la burbuja de Numi vacía y devuelve su id. El texto entra después, trozo a
   * trozo: la burbuja tiene que existir antes de la primera palabra para que se vea
   * llegar en vez de aparecer entera.
   */
  beginReply: () => string
  appendToReply: (id: string, delta: string) => void
  /**
   * Cierra el turno. Si no llegó a escribirse nada —se detuvo en el acto— la burbuja
   * vacía se retira: no es una respuesta corta, es una respuesta que no existe.
   */
  finishReply: (id: string, sessionId: string) => void
  /**
   * Retira la burbuja del turno que se rompió, con lo que llevara escrito.
   *
   * Media frase de Numi que nadie va a terminar no es información: es una respuesta a
   * medias que se lee como si fuera la buena, y al reintentar quedarían las dos. La
   * conversación no se toca — el fallo fue del turno, no del hilo.
   */
  discardReply: (id: string) => void
  setError: (error: NumiError | null) => void
  /** Siembra el hilo con la conversación persistida más reciente (una sola vez). */
  hydrate: (sessionId: string | undefined, messages: ChatMessage[]) => void
  /**
   * Se cambia a otra conversación de la lista. Sustituye el hilo entero, no lo
   * mezcla: son dos conversaciones distintas y ninguna continúa a la otra.
   */
  openThread: (conversationId: string, messages: ChatMessage[], until?: string) => void
  /** Empieza de cero: olvida el hilo del servidor y limpia la vista. */
  newConversation: () => void
  /** Ata el hilo a una organización; si cambia, la conversación se reinicia. */
  switchOrg: (orgId: string) => void
  setPending: (pending: boolean) => void
  setTurn: (turn: AbortController | null) => void
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
  // Un mensaje a medio enviar vuelve como fallido, no como «enviando»: el turno que
  // lo iba a mandar murió con la página, así que nadie iba a cumplir esa promesa.
  const status = rest.status === 'sent' || rest.status === undefined ? rest.status : 'failed'
  return { ...rest, ...(status ? { status } : {}) }
}

const EMPTY = { sessionId: undefined, messages: [] as ChatMessage[], error: null as NumiError | null }

export const useNumiStore = create<NumiState>()(
  persist(
    (set) => ({
      isOpen: false,
      orgId: null,
      hydrated: false,
      historyId: null,
      historyUntil: null,
      unread: false,
      pending: false,
      turn: null,
      ...EMPTY,

      // Abrir es haber visto lo que hubiera pendiente.
      open: () => set({ isOpen: true, unread: false }),
      close: () => set({ isOpen: false }),

      appendMessage: (role, content) =>
        set((s) => ({ messages: [...s.messages, message(role, content)] })),

      enqueueMessage: (content) => {
        const queued: ChatMessage = { ...message('user', content), status: 'queued' }
        set((s) => ({ messages: [...s.messages, queued], error: null }))
        return queued.id
      },

      adoptServerId: (localId, serverId) =>
        set((s) => {
          // Si el servidor ya lo mandó por otra vía, el local sobra en vez de duplicar.
          const yaEsta = s.messages.some((m) => m.id === serverId)
          return {
            messages: yaEsta
              ? s.messages.filter((m) => m.id !== localId)
              : s.messages.map((m) => (m.id === localId ? { ...m, id: serverId } : m)),
          }
        }),

      /*
        Se descarta lo que ya está por id, igual que `prependOlder`, y si no queda nada
        nuevo se devuelve el estado tal cual: esto lo dispara un aviso del servidor, y el
        caso normal es que el aviso sea del propio mensaje que se acaba de mandar.
      */
      appendNewer: (nuevos) =>
        set((s) => {
          const conocidos = new Set(s.messages.map((m) => m.id))
          const frescos = nuevos.filter((m) => !conocidos.has(m.id))
          if (frescos.length === 0) return s
          return { messages: [...s.messages, ...frescos] }
        }),

      setMessageStatus: (id, status) =>
        set((s) => ({
          messages: s.messages.map((m) => (m.id === id ? { ...m, status } : m)),
        })),

      appendAudio: (audio) =>
        set((s) => ({
          messages: [
            ...s.messages,
            {
              id: nextId(),
              role: 'user',
              content: '',
              at: new Date().toISOString(),
              dictated: true,
              status: 'sending',
              ...audio,
            },
          ],
        })),

      /*
        Se descarta lo que ya está por id, y si no queda nada nuevo se devuelve el
        estado tal cual: el efecto que llama a esto vuelve a correr cada vez que
        react-query rehace su array de páginas, y devolver un `messages` nuevo
        idéntico al anterior sería un render en bucle.
      */
      prependOlder: (older) =>
        set((s) => {
          const known = new Set(s.messages.map((m) => m.id))
          const fresh = older.filter((m) => !known.has(m.id))
          if (fresh.length === 0) return s
          return { messages: [...fresh, ...s.messages] }
        }),

      setFeedback: (id, feedback) =>
        set((s) => ({
          messages: s.messages.map((m) => (m.id === id ? { ...m, feedback } : m)),
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

      beginReply: () => {
        const bubble = message('assistant', '')
        set((s) => ({ messages: [...s.messages, bubble] }))
        return bubble.id
      },

      appendToReply: (id, delta) =>
        set((s) => ({
          messages: s.messages.map((m) => (m.id === id ? { ...m, content: m.content + delta } : m)),
        })),

      finishReply: (id, sessionId) =>
        set((s) => {
          const written = s.messages.find((m) => m.id === id)?.content ?? ''
          const messages = written
            ? s.messages
            : s.messages.filter((m) => m.id !== id)
          return {
            sessionId,
            messages,
            error: null,
            // Con el chat cerrado la respuesta no se ha visto: el icono lo dice.
            unread: written ? !s.isOpen : s.unread,
          }
        }),

      discardReply: (id) =>
        set((s) => ({ messages: s.messages.filter((m) => m.id !== id) })),

      setError: (error) => set({ error }),

      hydrate: (sessionId, messages) =>
        set((s) => {
          if (s.hydrated) return s
          // Si el usuario ya empezó a escribir antes de que llegara el historial,
          // se respeta su hilo nuevo. La conversación sigue siendo la misma, así
          // que lo anterior a lo que se ve continúa estando a un scroll.
          if (s.messages.length > 0) return { hydrated: true, historyId: s.sessionId ?? null }
          return { hydrated: true, historyId: sessionId ?? null, sessionId, messages }
        }),

      openThread: (conversationId, messages, until) =>
        set({
          sessionId: conversationId,
          // Viene del servidor, así que lo anterior a esto se puede ir a buscar.
          historyId: conversationId,
          historyUntil: until ?? null,
          messages,
          error: null,
          hydrated: true,
          unread: false,
        }),

      // Hilo limpio, pero marcado como hidratado para no recargar la conversación
      // que el usuario acaba de dejar.
      newConversation: () =>
        set({ ...EMPTY, hydrated: true, historyId: null, historyUntil: null, unread: false }),

      // Cambiar de organización reinicia el hilo y vuelve a hidratar con las
      // conversaciones de la nueva empresa.
      switchOrg: (orgId) =>
        set((s) =>
          s.orgId === orgId
            ? s
            : {
                orgId,
                ...EMPTY,
                hydrated: false,
                historyId: null,
                historyUntil: null,
                unread: false,
              },
        ),

      setPending: (pending) => set({ pending }),

      setTurn: (turn) => set({ turn }),
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
