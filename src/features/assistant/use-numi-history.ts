import { useCallback, useMemo } from 'react'
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getApiV1OrganizationsOrgIdAssistantConversations,
  getApiV1OrganizationsOrgIdAssistantConversationsIdMessages,
  getApiV1OrganizationsOrgIdAssistantConversationsIdMessagesMessageIdAudio,
  getApiV1OrganizationsOrgIdAssistantConversationsSearch,
  useDeleteApiV1OrganizationsOrgIdAssistantConversationsId,
  usePatchApiV1OrganizationsOrgIdAssistantConversationsId,
  usePutApiV1OrganizationsOrgIdAssistantConversationsIdMessagesMessageIdFeedback,
} from '@/api/generated/endpoints/assistant/assistant'
import type { AudioUrl, Conversation, MessageHit, MessageList, MessageSearch } from '@/api/generated/model'
import type { ChatFeedback, ChatMessage } from './types'
import { sanitizePeaks } from './waveform'

const CONVERSATIONS_PAGE = 20
const MESSAGES_PAGE = 30
/**
 * Cuánto se reutiliza una URL firmada antes de volver a pedirla. El contrato
 * dice «temporal» sin decir cuánto, así que cinco minutos: sobra para escuchar
 * la nota y no tanto como para servir un enlace ya caducado.
 */
const AUDIO_URL_TTL = 5 * 60 * 1000

/**
 * Flattens the newest-first message pages into an oldest→newest transcript (front shape).
 * Pages arrive newest→oldest and each page is itself newest-first; reversing both yields the
 * natural reading order (oldest at the top, newest at the bottom).
 */
/** Un mensaje del contrato, con la forma que usa el hilo. */
export function toChatMessage(m: MessageList['items'][number]): ChatMessage {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    at: m.createdAt,
    dictated: m.source === 'audio',
    hasAudio: m.hasAudio,
    waveform: sanitizePeaks(m.waveform),
    audioSeconds: m.audioSeconds ?? undefined,
    feedback: m.feedback ?? undefined,
  }
}

/**
 * Flattens the newest-first message pages into an oldest→newest transcript (front shape).
 * Pages arrive newest→oldest and each page is itself newest-first; reversing both yields the
 * natural reading order (oldest at the top, newest at the bottom).
 */
export function flattenMessagePages(pages: MessageList[]): ChatMessage[] {
  return [...pages].reverse().flatMap((page) => [...page.items].reverse().map(toChatMessage))
}

/** The caller's Numi conversations (chat list), most recent first, with cursor paging. */
export function useNumiConversations(orgId: string | undefined) {
  const query = useInfiniteQuery({
    queryKey: conversationsKey(orgId),
    enabled: Boolean(orgId),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam, signal }) => {
      const res = await getApiV1OrganizationsOrgIdAssistantConversations(
        orgId ?? '',
        { limit: CONVERSATIONS_PAGE, cursor: pageParam },
        { signal },
      )
      return res.data
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })

  const conversations: Conversation[] = (query.data?.pages ?? []).flatMap((p) => p.items)
  return {
    conversations,
    error: query.error,
    isLoading: query.isLoading,
    hasMore: query.hasNextPage,
    isLoadingMore: query.isFetchingNextPage,
    loadMore: query.fetchNextPage,
  }
}

/** Clave de la lista de conversaciones: lo que hay que refrescar al renombrar o borrar. */
const conversationsKey = (orgId: string | undefined) => ['numi', 'conversations', orgId]

/**
 * Definición única de la query paginada de mensajes.
 *
 * La comparten el hilo abierto y la apertura de una conversación desde la lista. Si
 * cada uno tuviera la suya, abrir una conversación llenaría una caché que el scroll
 * hacia arriba no mira, y la primera página se pediría dos veces.
 */
function messagesQuery(orgId: string, conversationId: string, until?: string) {
  return {
    // `until` entra en la clave: abrir la conversación en un mensaje concreto es otra
    // caché, no la misma con otro cursor. Compartirla mezclaría dos hilos distintos.
    queryKey: ['numi', 'messages', orgId, conversationId, until ?? 'latest'],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({
      pageParam,
      signal,
    }: {
      pageParam?: string
      signal?: AbortSignal
    }): Promise<MessageList> => {
      const res = await getApiV1OrganizationsOrgIdAssistantConversationsIdMessages(
        orgId,
        conversationId,
        // `until` solo manda en la primera página; a partir de ahí el cursor `before`
        // ya la deja anclada y repetirlo no cambiaría nada.
        { limit: MESSAGES_PAGE, before: pageParam, until: pageParam ? undefined : until },
        { signal },
      )
      // customFetch throws on non-2xx, so on success this is always a MessageList.
      return res.data as MessageList
    },
    getNextPageParam: (lastPage: MessageList) => lastPage.nextCursor ?? undefined,
  }
}

/**
 * A conversation's messages with WhatsApp-style scroll-up. Pages load newest-first;
 * `messages` is the oldest→newest transcript ready to render. Call `loadOlder()` (near the
 * top of the scroll container) to fetch the previous page.
 */
export function useNumiMessages(
  orgId: string | undefined,
  conversationId: string | undefined,
  until?: string,
) {
  const query = useInfiniteQuery({
    ...messagesQuery(orgId ?? '', conversationId ?? '', until),
    enabled: Boolean(orgId && conversationId),
  })

  const pages = query.data?.pages

  // `flattenMessagePages` construye un array nuevo en cada render, y de él cuelgan
  // efectos: sin memoizar, cada render dispararía el siguiente.
  const messages = useMemo(() => flattenMessagePages(pages ?? []), [pages])

  /**
   * Solo lo que hay **por encima** de la primera página.
   *
   * La primera es la que ya sembró el hilo al abrir, y volver a mezclarla duplicaría
   * lo que el usuario acaba de escribir: un mensaje enviado vive en el hilo con un id
   * de cliente hasta que el servidor le da el suyo, así que las dos copias no se
   * reconocen entre sí. De la segunda página en adelante no existe esa ambigüedad —
   * son mensajes estrictamente más viejos que los de la pantalla.
   */
  const older = useMemo(() => flattenMessagePages((pages ?? []).slice(1)), [pages])

  return {
    messages,
    older,
    error: query.error,
    isLoading: query.isLoading,
    hasOlder: query.hasNextPage,
    isLoadingOlder: query.isFetchingNextPage,
    loadOlder: query.fetchNextPage,
  }
}

/**
 * Abre una conversación de la lista: trae su última página y la devuelve como hilo.
 *
 * Va por `fetchInfiniteQuery` y no por un fetch suelto para dejar la caché en el
 * mismo sitio del que luego tira el scroll hacia arriba: al abrirla, su primera
 * página ya está puesta y el cursor apunta a lo anterior.
 */
export function useConversationOpener(orgId: string | undefined) {
  const queryClient = useQueryClient()

  return useCallback(
    async (conversationId: string, until?: string): Promise<ChatMessage[]> => {
      if (!orgId) return []
      const data = await queryClient.fetchInfiniteQuery(
        messagesQuery(orgId, conversationId, until),
      )
      return flattenMessagePages(data.pages)
    },
    [queryClient, orgId],
  )
}

/** Lo que hay que escribir antes de que valga la pena preguntarle al servidor. */
const MIN_SEARCH = 2

/**
 * Buscar en las conversaciones propias.
 *
 * Con menos de dos caracteres no se pregunta: el servidor lo rechazaría y una `a` suelta
 * traería medio historial. El término ya viene retrasado desde la vista, así que aquí no
 * se vuelve a esperar.
 */
export function useMessageSearch(orgId: string | undefined, q: string) {
  const term = q.trim()
  const enabled = Boolean(orgId) && term.length >= MIN_SEARCH

  const query = useQuery({
    queryKey: ['numi', 'search', orgId, term],
    enabled,
    queryFn: async ({ signal }) => {
      const res = await getApiV1OrganizationsOrgIdAssistantConversationsSearch(
        orgId ?? '',
        { q: term },
        { signal },
      )
      return res.data as MessageSearch
    },
  })

  const hits: MessageHit[] = query.data?.items ?? []
  return { hits, isSearching: enabled && query.isPending, error: query.error, enabled }
}

/**
 * Ponerle nombre a una conversación y quitarla de la lista.
 *
 * Las dos invalidan la lista al terminar, que es la vista que cambia. Borrar además
 * tira la caché de sus mensajes: el servidor ya no los sirve, y dejarlos ahí haría
 * que la conversación reapareciese entera si algo volviera a montar ese hilo.
 */
export function useConversationActions(orgId: string | undefined) {
  const queryClient = useQueryClient()
  const renameMutation = usePatchApiV1OrganizationsOrgIdAssistantConversationsId()
  const removeMutation = useDeleteApiV1OrganizationsOrgIdAssistantConversationsId()

  const rename = useCallback(
    async (conversationId: string, title: string) => {
      if (!orgId) return
      await renameMutation.mutateAsync({ orgId, id: conversationId, data: { title } })
      await queryClient.invalidateQueries({ queryKey: conversationsKey(orgId) })
    },
    [orgId, renameMutation, queryClient],
  )

  const remove = useCallback(
    async (conversationId: string) => {
      if (!orgId) return
      await removeMutation.mutateAsync({ orgId, id: conversationId })
      queryClient.removeQueries({ queryKey: ['numi', 'messages', orgId, conversationId] })
      await queryClient.invalidateQueries({ queryKey: conversationsKey(orgId) })
    },
    [orgId, removeMutation, queryClient],
  )

  return { rename, remove, isRenaming: renameMutation.isPending, isRemoving: removeMutation.isPending }
}

/**
 * Lo que se dijo después del último mensaje que tenemos.
 *
 * El servidor ya lo devuelve en orden de lectura con `after`, así que aquí no se le da la
 * vuelta a nada: se pide, se traduce y se añade por el final.
 */
export function useNewerMessages(orgId: string | undefined) {
  return useCallback(
    async (conversationId: string, after: string): Promise<ChatMessage[]> => {
      if (!orgId) return []
      const res = await getApiV1OrganizationsOrgIdAssistantConversationsIdMessages(
        orgId,
        conversationId,
        { limit: MESSAGES_PAGE, after },
      )
      return (res.data as MessageList).items.map(toChatMessage)
    },
    [orgId],
  )
}

/**
 * Puntuar una respuesta de Numi.
 *
 * Devuelve la llamada cruda, sin optimismo ni reversión: eso vive donde está el hilo, que
 * es quien pinta el pulgar. Aquí solo se habla con el servidor.
 */
export function useMessageRating(orgId: string | undefined, conversationId: string | undefined) {
  const mutation = usePutApiV1OrganizationsOrgIdAssistantConversationsIdMessagesMessageIdFeedback()

  return useCallback(
    async (messageId: string, feedback: ChatFeedback | null) => {
      if (!orgId || !conversationId) return
      await mutation.mutateAsync({
        orgId,
        id: conversationId,
        messageId,
        data: { feedback },
      })
    },
    [mutation, orgId, conversationId],
  )
}

/**
 * **Reproducir una nota de voz del historial.**
 *
 * Devuelve una función que pide la URL firmada de un mensaje concreto. Se llama
 * al pulsar play y no al pintar el hilo: la URL caduca, y una conversación de
 * treinta mensajes dictados dispararía treinta peticiones para audios que casi
 * nadie va a escuchar.
 *
 * Pasa por `fetchQuery` y no por un `fetch` suelto para heredar lo de siempre:
 * dos pulsaciones seguidas comparten la misma petición, y volver a darle a play
 * dentro del rato reutiliza el enlace en vez de firmar otro.
 */
export function useMessageAudioLoader(orgId: string | undefined, conversationId: string | undefined) {
  const queryClient = useQueryClient()

  return useCallback(
    async (messageId: string, force = false): Promise<string> => {
      if (!orgId || !conversationId) throw new Error('Sin conversación')
      const queryKey = ['numi', 'audio', orgId, conversationId, messageId]
      // Reintento tras un fallo: la URL guardada pudo caducar, se tira.
      if (force) queryClient.removeQueries({ queryKey })
      return queryClient.fetchQuery({
        queryKey,
        queryFn: async () => {
          const res = await getApiV1OrganizationsOrgIdAssistantConversationsIdMessagesMessageIdAudio(
            orgId,
            conversationId,
            messageId,
          )
          return (res.data as AudioUrl).url
        },
        staleTime: AUDIO_URL_TTL,
        gcTime: AUDIO_URL_TTL,
      })
    },
    [queryClient, orgId, conversationId],
  )
}
