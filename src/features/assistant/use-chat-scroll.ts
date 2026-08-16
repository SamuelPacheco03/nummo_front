import { useCallback, useLayoutEffect, useRef } from 'react'
import type { ChatMessage } from './types'

interface Options {
  messages: ChatMessage[]
  hasOlder: boolean
  isLoadingOlder: boolean
  loadOlder: () => void
  /** Changing this (e.g. the conversation id) resets the scroll to the bottom. */
  resetKey?: string
}

const TOP_THRESHOLD_PX = 80

/**
 * WhatsApp-style scrolling for the transcript. Attach the returned `ref` to the scrollable
 * container. It:
 *  - sticks to the bottom on the first load and when a new message arrives,
 *  - preserves the reading position when older messages are prepended (scroll up),
 *  - calls `loadOlder()` when the user scrolls near the top.
 */
export function useChatScroll({ messages, hasOlder, isLoadingOlder, loadOlder, resetKey }: Options) {
  const ref = useRef<HTMLDivElement>(null)
  const prevFirstId = useRef<string | undefined>(undefined)
  const prevScrollHeight = useRef(0)

  // Reset when the conversation changes: forget the previous thread and jump to the bottom.
  useLayoutEffect(() => {
    prevFirstId.current = undefined
    prevScrollHeight.current = 0
    const el = ref.current
    if (el) el.scrollTop = el.scrollHeight
  }, [resetKey])

  // After each render: keep position on prepend, stick to the bottom on append/first load.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const firstId = messages[0]?.id
    const prepended = prevFirstId.current !== undefined && firstId !== prevFirstId.current
    if (prepended) {
      el.scrollTop += el.scrollHeight - prevScrollHeight.current
    } else {
      el.scrollTop = el.scrollHeight
    }
    prevFirstId.current = firstId
    prevScrollHeight.current = el.scrollHeight
  }, [messages])

  const onScroll = useCallback(() => {
    const el = ref.current
    if (el && el.scrollTop <= TOP_THRESHOLD_PX && hasOlder && !isLoadingOlder) loadOlder()
  }, [hasOlder, isLoadingOlder, loadOlder])

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [onScroll])

  return ref
}
