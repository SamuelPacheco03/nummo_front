import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { NumiAvatar } from './numi-avatar'
import { RichText } from './rich-text'
import type { ChatMessage } from './types'

/** Una burbuja del hilo. `children` permite inyectar contenido (p. ej. los puntos de "escribiendo"). */
export function ChatBubble({
  role,
  children,
  className,
}: {
  role: ChatMessage['role']
  children: ReactNode
  className?: string
}) {
  const isUser = role === 'user'
  return (
    <div className={cn('flex w-full items-end gap-2', isUser && 'flex-row-reverse')}>
      {!isUser && <NumiAvatar className="mb-0.5" />}
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed break-words',
          isUser
            ? 'bg-brand text-brand-foreground rounded-br-sm'
            : 'bg-secondary text-secondary-foreground rounded-bl-sm',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function ChatMessageItem({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <ChatBubble role={message.role} className="animate-in fade-in-0 slide-in-from-bottom-1">
      <span className="sr-only">{isUser ? 'Tú' : 'Numi'}: </span>
      {isUser ? (
        <p className="whitespace-pre-wrap">{message.content}</p>
      ) : (
        <RichText text={message.content} />
      )}
    </ChatBubble>
  )
}
