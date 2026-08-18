import { useCallback } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import {
  getApiV1OrganizationsOrgIdAssistantConversations,
  getApiV1OrganizationsOrgIdAssistantConversationsIdMessages,
  getApiV1OrganizationsOrgIdAssistantConversationsIdMessagesMessageIdAudio,
} from '@/api/generated/endpoints/assistant/assistant'
import type { AudioUrl, Conversation, MessageList } from '@/api/generated/model'
import type { ChatMessage } from './types'
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
export function flattenMessagePages(pages: MessageList[]): ChatMessage[] {
  return [...pages].reverse().flatMap((page) =>
    [...page.items].reverse().map((m) => {
      return {
        id: m.id,
        role: m.role,
        content: m.content,
        at: m.createdAt,
        dictated: m.source === 'audio',
        hasAudio: m.hasAudio,
        waveform: sanitizePeaks(m.waveform),
        audioSeconds: m.audioSeconds ?? undefined,
      }
    }),
  )
}

/** The caller's Numi conversations (chat list), most recent first, with cursor paging. */
export function useNumiConversations(orgId: string | undefined) {
  const query = useInfiniteQuery({
    queryKey: ['numi', 'conversations', orgId],
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

/**
 * A conversation's messages with WhatsApp-style scroll-up. Pages load newest-first;
 * `messages` is the oldest→newest transcript ready to render. Call `loadOlder()` (near the
 * top of the scroll container) to fetch the previous page.
 */
export function useNumiMessages(orgId: string | undefined, conversationId: string | undefined) {
  const query = useInfiniteQuery({
    queryKey: ['numi', 'messages', orgId, conversationId],
    enabled: Boolean(orgId && conversationId),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam, signal }) => {
      const res = await getApiV1OrganizationsOrgIdAssistantConversationsIdMessages(
        orgId ?? '',
        conversationId ?? '',
        { limit: MESSAGES_PAGE, before: pageParam },
        { signal },
      )
      // customFetch throws on non-2xx, so on success this is always a MessageList.
      return res.data as MessageList
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })

  return {
    messages: flattenMessagePages(query.data?.pages ?? []),
    error: query.error,
    isLoading: query.isLoading,
    hasOlder: query.hasNextPage,
    isLoadingOlder: query.isFetchingNextPage,
    loadOlder: query.fetchNextPage,
  }
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
