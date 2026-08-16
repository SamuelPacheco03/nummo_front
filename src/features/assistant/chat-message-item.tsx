import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { NumiAvatar } from './numi-avatar'
import { RichText } from './rich-text'
import { formatTime } from './utils'
import type { ChatMessage } from './types'

/**
 * Burbuja del hilo. Superficie plana con borde (el lenguaje de consola del
 * resto de la app) en vez de globo relleno: el mensaje del usuario va en azul
 * de marca y el de Numi sobre la tarjeta, con la esquina del lado de quien
 * habla recortada.
 */
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
    <div
      className={cn(
        'max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed break-words',
        isUser
          ? 'bg-primary text-primary-foreground rounded-br-sm'
          : 'bg-card text-card-foreground rounded-bl-sm border',
        className,
      )}
    >
      {children}
    </div>
  )
}

/**
 * Fila de un mensaje. Los turnos seguidos del mismo interlocutor se agrupan:
 * solo el primero lleva la cara de Numi, para que el hilo no se llene de
 * iconos repetidos.
 */
export function ChatMessageItem({
  message,
  grouped = false,
}: {
  message: ChatMessage
  grouped?: boolean
}) {
  const isUser = message.role === 'user'
  return (
    <div className={cn('flex w-full gap-2', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="w-6 shrink-0">{!grouped && <NumiAvatar className="mt-1" />}</div>
      )}
      <div className={cn('flex min-w-0 flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
        <ChatBubble role={message.role} className="animate-in fade-in-0 slide-in-from-bottom-1">
          <span className="sr-only">{isUser ? 'Tú' : 'Numi'}: </span>
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <RichText text={message.content} />
          )}
        </ChatBubble>
        <time
          dateTime={message.at}
          className="text-muted-foreground px-1 text-[0.65rem] tabular-nums"
        >
          {formatTime(message.at)}
        </time>
      </div>
    </div>
  )
}
