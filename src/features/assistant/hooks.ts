import { useCallback, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { usePostApiV1OrganizationsOrgIdAssistantChatAudio } from '@/api/generated/endpoints/assistant/assistant'
import type { AssistantAudioChatResponse } from '@/api/generated/model'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { classifyNumiError } from './numi-error'
import { streamChat } from './stream-chat'
import { MAX_MESSAGE_LENGTH } from './constants'
import { useNumiStore } from './numi-store'
import type { ChatFeedback } from './types'
import { describeRecording } from './waveform'
import {
  useConversationOpener,
  useMessageAudioLoader,
  useMessageRating,
  useNumiConversations,
  useNumiMessages,
} from './use-numi-history'
import { shouldRefreshData } from './utils'

/**
 * Al abrir el panel, siembra el hilo con la conversación persistida más reciente
 * (una sola vez por sesión de cliente). Con `hydrated`, deshabilita las queries
 * pasando `orgId` undefined para no volver a pedir el historial.
 */
function useHydrateThread(orgId: string | undefined) {
  const hydrated = useNumiStore((s) => s.hydrated)
  const hydrate = useNumiStore((s) => s.hydrate)
  const activeOrg = hydrated ? undefined : orgId
  const { conversations, isLoading: loadingConversations } = useNumiConversations(activeOrg)
  const latestId = conversations[0]?.id
  const { messages, isLoading: loadingMessages } = useNumiMessages(activeOrg, latestId)

  useEffect(() => {
    if (hydrated || !orgId || loadingConversations) return
    // Sin conversaciones previas → hilo vacío (se ve el saludo).
    if (!latestId) {
      hydrate(undefined, [])
      return
    }
    if (loadingMessages) return
    hydrate(latestId, messages)
  }, [hydrated, orgId, loadingConversations, latestId, loadingMessages, messages, hydrate])
}

/**
 * Lo anterior a lo que se ve: subir en el hilo trae la página previa del servidor.
 *
 * Hidratar siembra el final de la conversación y esto continúa hacia atrás, de
 * treinta en treinta. Va contra la misma clave de react-query que usó la hidratación,
 * así que la primera página ya está en caché y volver a montarla no cuesta una
 * petición.
 */
function useOlderThread(orgId: string | undefined) {
  // `historyId` es la precondición del hook: solo una conversación que ya existía en
  // el servidor tiene algo por encima. Sin él esto pediría una página inexistente
  // cada vez que alguien estrena conversación.
  const historyId = useNumiStore((s) => s.historyId)
  // Abierta desde una búsqueda: se continúa desde ese mensaje, no desde el final.
  const historyUntil = useNumiStore((s) => s.historyUntil)
  const prependOlder = useNumiStore((s) => s.prependOlder)
  const { older, hasOlder, isLoadingOlder, loadOlder } = useNumiMessages(
    historyId ? orgId : undefined,
    historyId ?? undefined,
    historyUntil ?? undefined,
  )

  useEffect(() => {
    if (older.length > 0) prependOlder(older)
  }, [older, prependOlder])

  return { hasOlder, isLoadingOlder, loadOlder }
}

/**
 * Conversación con Numi: envío, estado "escribiendo", errores y refresco de
 * datos. Es el único punto que conoce el endpoint; la UI solo consume esto.
 */
export function useNumiChat() {
  const { orgId, role, organization } = useCurrentOrg()
  const queryClient = useQueryClient()
  const messages = useNumiStore((s) => s.messages)
  const error = useNumiStore((s) => s.error)
  const switchOrg = useNumiStore((s) => s.switchOrg)
  const newConversation = useNumiStore((s) => s.newConversation)
  const audioChat = usePostApiV1OrganizationsOrgIdAssistantChatAudio()
  const hydrated = useNumiStore((s) => s.hydrated)
  /*
    «Escribiendo…» vive en el store, no en el hook de la mutación. El panel se
    desmonta al cerrarlo y con él la mutación: al volver a abrir con la
    respuesta todavía en camino, el hilo se quedaba callado como si no hubiera
    nada pendiente. El turno es del hilo, no del panel.
  */
  const pending = useNumiStore((s) => s.pending)
  // La conversación viva del hilo: de ella cuelgan los audios archivados.
  const conversationId = useNumiStore((s) => s.sessionId)
  const loadAudio = useMessageAudioLoader(orgId, conversationId)
  const { hasOlder, isLoadingOlder, loadOlder } = useOlderThread(orgId)
  const sendRating = useMessageRating(orgId, conversationId)

  /**
   * Pulgar arriba o abajo sobre una respuesta de Numi. Volver a pulsar el mismo lo retira.
   *
   * El pulgar se pinta antes de preguntar —es una opinión, no una operación, y esperar
   * medio segundo por un dibujo no tiene sentido— pero si el servidor lo rechaza se
   * deshace: una opinión que se ve guardada y no lo está es peor que no poder darla.
   */
  const rateMessage = useCallback(
    async (messageId: string, feedback: ChatFeedback) => {
      const store = useNumiStore.getState()
      const previo = store.messages.find((m) => m.id === messageId)?.feedback
      const siguiente = previo === feedback ? undefined : feedback
      store.setFeedback(messageId, siguiente)
      try {
        await sendRating(messageId, siguiente ?? null)
      } catch {
        useNumiStore.getState().setFeedback(messageId, previo)
        toast.error('No se pudo guardar tu opinión.')
      }
    },
    [sendRating],
  )
  const fetchThread = useConversationOpener(orgId)

  /** Se cambia a una conversación de la lista y la deja abierta en el hilo. */
  const openConversation = useCallback(
    async (conversationId: string, until?: string) => {
      const messages = await fetchThread(conversationId, until)
      useNumiStore.getState().openThread(conversationId, messages, until)
    },
    [fetchThread],
  )

  // El hilo pertenece a una organización: si el usuario cambia de empresa, la
  // conversación anterior habla de datos que ya no son los de esta pantalla.
  useEffect(() => {
    if (orgId) switchOrg(orgId)
  }, [orgId, switchOrg])

  // Historial persistido: al abrir el panel, el hilo se siembra con la última
  // conversación de la organización (ver `useHydrateThread`).
  useHydrateThread(orgId)

/** Saca un mensaje de la cola y lo lleva al servidor, marcándolo por el camino. */
  const deliver = useCallback(
    async (id: string, content: string) => {
      if (!orgId) return
      // Se lee del store (no del render) para no mandar un sessionId obsoleto.
      const { sessionId, setError, setPending, setMessageStatus } = useNumiStore.getState()
      setMessageStatus(id, 'sending')
      setError(null)
      setPending(true)

      const stop = new AbortController()
      useNumiStore.getState().setTurn(stop)
      // La burbuja se abre antes de la primera palabra: así se ve escribir en vez de
      // aparecer entera, que es la diferencia entre esperar y acompañar.
      const bubble = useNumiStore.getState().beginReply()

      try {
        const { sessionId: nextSessionId, reply } = await streamChat({
          orgId,
          message: content,
          sessionId,
          signal: stop.signal,
          onChunk: (text) => useNumiStore.getState().appendToReply(bubble, text),
        })
        const store = useNumiStore.getState()
        store.setMessageStatus(id, 'sent')
        store.finishReply(bubble, nextSessionId)
        // Numi también registra operaciones: si el turno pudo escribir, se
        // refresca lo que esté montado (ver `shouldRefreshData`).
        if (shouldRefreshData(content, reply)) void queryClient.invalidateQueries()
      } catch (err) {
        const store = useNumiStore.getState()
        store.discardReply(bubble)
        store.setMessageStatus(id, 'failed')
        store.setError(classifyNumiError(err, 'No se pudo contactar a Numi. Inténtalo de nuevo.'))
      } finally {
        useNumiStore.getState().setTurn(null)
        useNumiStore.getState().setPending(false)
      }
    },
    [orgId, queryClient],
  )

  /**
   * Corta el turno en curso. Lo que Numi alcanzó a escribir se queda, aquí y en el
   * servidor: cerrar la conexión es la señal, y el backend archiva lo que llevaba.
   */
  const stop = useCallback(() => {
    useNumiStore.getState().turn?.abort()
  }, [])

  /*
    Un turno a la vez, y en orden. El despachador vive en un efecto y no dentro de
    `send` para que la cola sea del hilo y no de esta llamada: si el panel se cierra
    con algo esperando, al volver a abrir sigue esperando y sale igual.
  */
  useEffect(() => {
    if (pending || !orgId) return
    const next = messages.find((m) => m.status === 'queued')
    // `deliver` marca 'sending' y ocupa el turno antes de su primer await, así que
    // el siguiente paso de este efecto ya no lo vuelve a coger.
    if (next) void deliver(next.id, next.content)
  }, [pending, orgId, messages, deliver])

  /** Escribir no espera a Numi: el mensaje entra en la cola y sale cuando haya turno. */
  const send = useCallback((raw: string) => {
    const message = raw.trim().slice(0, MAX_MESSAGE_LENGTH)
    if (!message) return
    useNumiStore.getState().enqueueMessage(message)
  }, [])

  /** Envía una nota de voz: se muestra la burbuja de audio y Numi transcribe y responde. */
  const sendAudio = useCallback(
    async (blob: Blob) => {
      if (!orgId || useNumiStore.getState().pending) return
      const store = useNumiStore.getState()
      store.setPending(true)
      store.appendAudio({ audioUrl: URL.createObjectURL(blob) })
      const id = useNumiStore.getState().messages.at(-1)?.id
      /*
        La onda se saca del blob recién grabado —el único momento en que el
        audio está en la mano sin costar una petición— y la burbuja ya está
        pintada arriba, así que nadie espera por ella. Se decodifica una sola
        vez: la misma promesa dibuja la nota en cuanto llega y viaja con la
        petición para que el historial la conserve.

        El `catch` no es adorno: `describeRecording` puede fallar antes de su
        propio try (un navegador sin AudioContext), y ahora que se espera, una
        onda rota se llevaría por delante el mensaje. Es decoración — nunca
        puede impedir que la nota salga.
      */
      const described = describeRecording(blob).catch(
        () => [undefined, undefined] as [number[] | undefined, number | undefined],
      )
      if (id) {
        void described.then(([waveform, audioSeconds]) => {
          if (waveform) useNumiStore.getState().setWaveform(id, waveform, audioSeconds)
        })
      }
      store.setError(null)
      try {
        const { sessionId } = useNumiStore.getState()
        const [waveform, audioSeconds] = await described
        const res = await audioChat.mutateAsync({
          orgId,
          // El servidor los guarda tal cual y descarta en silencio lo que no cuadre.
          data: {
            audio: blob,
            sessionId,
            waveform: waveform && JSON.stringify(waveform),
            audioSeconds: audioSeconds === undefined ? undefined : String(audioSeconds),
          },
        })
        const { sessionId: nextSessionId, transcript, reply } = res.data as AssistantAudioChatResponse
        const s = useNumiStore.getState()
        if (id) {
          s.setTranscript(id, transcript)
          s.setMessageStatus(id, 'sent')
        }
        s.appendReply(nextSessionId, reply)
        if (shouldRefreshData(transcript, reply)) void queryClient.invalidateQueries()
      } catch (err) {
        const s = useNumiStore.getState()
        if (id) s.setMessageStatus(id, 'failed')
        s.setError(classifyNumiError(err, 'No se pudo enviar el audio. Inténtalo de nuevo.'))
      } finally {
        useNumiStore.getState().setPending(false)
      }
    },
    [audioChat, orgId, queryClient],
  )

/**
   * Reintentar un mensaje que no salió: vuelve a la cola y el despachador lo recoge.
   * Los dictados no se reintentan — su audio era un blob de esta página y ya no está.
   */
  const retryMessage = useCallback((id: string) => {
    const store = useNumiStore.getState()
    store.setError(null)
    store.setMessageStatus(id, 'queued')
  }, [])

  return {
    messages,
    error,
    /** Mientras el backend responde (texto o audio): el hilo muestra "escribiendo…". */
    isTyping: pending,
    /** Cargando el historial persistido al abrir: se muestra un loader, no el saludo. */
    isHydrating: !hydrated && !!orgId,
    /** Queda conversación por encima de lo que se ve. */
    hasOlder,
    isLoadingOlder,
    /** Trae la página anterior y la pone por delante del hilo. */
    loadOlder,
    canChat: !!orgId,
    orgId,
    /** La conversación abierta; la lista la señala y de ella cuelgan los audios. */
    conversationId,
    role,
    /** Nombre de la organización: el hilo habla de SUS datos, y eso se ve en la cabecera. */
    orgName: organization?.name,
    send,
    sendAudio,
    /** Devuelve a la cola un mensaje que falló. */
    retryMessage,
    /** Pulgar sobre una respuesta de Numi; el mismo dos veces lo retira. */
    rateMessage,
    /** Detiene la respuesta en curso, conservando lo escrito. */
    stop,
    newConversation,
    /** Abre otra conversación del historial en el hilo. */
    openConversation,
    /** Pide la URL firmada de una nota de voz archivada (§«Numi»). */
    loadAudio,
  }
}
