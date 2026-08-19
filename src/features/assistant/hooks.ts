import { useCallback, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  usePostApiV1OrganizationsOrgIdAssistantChat,
  usePostApiV1OrganizationsOrgIdAssistantChatAudio,
} from '@/api/generated/endpoints/assistant/assistant'
import type { AssistantAudioChatResponse, AssistantChatResponse } from '@/api/generated/model'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { getErrorMessage, isApiStatus } from '@/lib/errors'
import { MAX_MESSAGE_LENGTH } from './constants'
import { useNumiStore } from './numi-store'
import { describeRecording } from './waveform'
import { useMessageAudioLoader, useNumiConversations, useNumiMessages } from './use-numi-history'
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
  const prependOlder = useNumiStore((s) => s.prependOlder)
  const { older, hasOlder, isLoadingOlder, loadOlder } = useNumiMessages(
    historyId ? orgId : undefined,
    historyId ?? undefined,
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
  const { mutateAsync } = usePostApiV1OrganizationsOrgIdAssistantChat()
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

  // El hilo pertenece a una organización: si el usuario cambia de empresa, la
  // conversación anterior habla de datos que ya no son los de esta pantalla.
  useEffect(() => {
    if (orgId) switchOrg(orgId)
  }, [orgId, switchOrg])

  // Historial persistido: al abrir el panel, el hilo se siembra con la última
  // conversación de la organización (ver `useHydrateThread`).
  useHydrateThread(orgId)

  /** Envía al backend y consume la respuesta. No toca el hilo del usuario. */
  const ask = useCallback(
    async (message: string) => {
      if (!orgId) return
      // Se lee del store (no del render) para no mandar un sessionId obsoleto.
      const { sessionId, appendReply, setError, setPending } = useNumiStore.getState()
      setError(null)
      setPending(true)
      try {
        const res = await mutateAsync({ orgId, data: { message, sessionId } })
        const { sessionId: nextSessionId, reply } = res.data as AssistantChatResponse
        appendReply(nextSessionId, reply)
        // Numi también registra operaciones: si el turno pudo escribir, se
        // refresca lo que esté montado (ver `shouldRefreshData`).
        if (shouldRefreshData(message, reply)) void queryClient.invalidateQueries()
      } catch (err) {
        setError({
          message: getErrorMessage(err, 'No se pudo contactar a Numi. Inténtalo de nuevo.'),
          // 422 en este endpoint = no hay proveedor de IA activo.
          needsSetup: isApiStatus(err, 422),
        })
      } finally {
        useNumiStore.getState().setPending(false)
      }
    },
    [mutateAsync, orgId, queryClient],
  )

  const send = useCallback(
    async (raw: string) => {
      const message = raw.trim().slice(0, MAX_MESSAGE_LENGTH)
      if (!message || useNumiStore.getState().pending) return
      useNumiStore.getState().appendMessage('user', message)
      await ask(message)
    },
    [ask],
  )

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
        if (id) s.setTranscript(id, transcript)
        s.appendReply(nextSessionId, reply)
        if (shouldRefreshData(transcript, reply)) void queryClient.invalidateQueries()
      } catch (err) {
        useNumiStore.getState().setError({
          message: getErrorMessage(err, 'No se pudo enviar el audio. Inténtalo de nuevo.'),
          needsSetup: isApiStatus(err, 422),
        })
      } finally {
        useNumiStore.getState().setPending(false)
      }
    },
    [audioChat, orgId, queryClient],
  )

  /** Reintenta el último mensaje de TEXTO del usuario (los audios no se reintentan). */
  const retry = useCallback(async () => {
    if (useNumiStore.getState().pending) return
    const last = useNumiStore.getState().messages.findLast((m) => m.role === 'user' && !!m.content)
    if (last) await ask(last.content)
  }, [ask])

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
    role,
    /** Nombre de la organización: el hilo habla de SUS datos, y eso se ve en la cabecera. */
    orgName: organization?.name,
    send,
    sendAudio,
    retry,
    newConversation,
    /** Pide la URL firmada de una nota de voz archivada (§«Numi»). */
    loadAudio,
  }
}
