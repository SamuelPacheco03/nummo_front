import { useInfiniteQuery } from '@tanstack/react-query'
import {
  getApiV1OrganizationsOrgIdAssistantConversations,
  getApiV1OrganizationsOrgIdAssistantConversationsIdMessages,
} from '@/api/generated/endpoints/assistant/assistant'
import type { Conversation, MessageList } from '@/api/generated/model'
import type { ChatMessage } from './types'

const CONVERSATIONS_PAGE = 20
const MESSAGES_PAGE = 30

/**
 * Flattens the newest-first message pages into an oldest→newest transcript (front shape).
 * Pages arrive newest→oldest and each page is itself newest-first; reversing both yields the
 * natural reading order (oldest at the top, newest at the bottom).
 */
export function flattenMessagePages(pages: MessageList[]): ChatMessage[] {
  return [...pages].reverse().flatMap((page) =>
    [...page.items].reverse().map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      at: m.createdAt,
    })),
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
