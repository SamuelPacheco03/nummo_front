import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { RichText } from './rich-text'
import { formatTime } from './utils'
import type { ChatMessage } from './types'

/**
 * Burbuja del hilo, al modo de un chat de mensajería: la primera de cada tanda
 * lleva cola hacia su lado.
 *
 * La cola es un triángulo CSS del mismo color que la burbuja; por eso estas
 * superficies van sin borde (con borde habría que dibujarlo también en el
 * triángulo) y se separan del fondo con una sombra mínima.
 */
export function ChatBubble({
  role,
  withTail = true,
  children,
  className,
}: {
  role: ChatMessage['role']
  withTail?: boolean
  children: ReactNode
  className?: string
}) {
  const isUser = role === 'user'
  return (
    <div
      className={cn(
        'relative max-w-[78%] rounded-lg px-2.5 py-1.5 text-sm leading-relaxed break-words shadow-sm',
        isUser
          ? 'bg-chat-bubble text-chat-bubble-foreground'
          : 'bg-card text-card-foreground',
        withTail && [
          'before:absolute before:top-0 before:size-0 before:border-t-8',
          isUser
            ? 'rounded-tr-none before:-right-2 before:border-r-8 before:border-t-chat-bubble before:border-r-transparent'
            : 'rounded-tl-none before:-left-2 before:border-l-8 before:border-t-card before:border-l-transparent',
        ],
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Ancho que la hora reserva al final de la última línea del mensaje. */
const TIME_SLOT = 'inline-block w-[3.4rem] align-baseline'

/**
 * Fila de un mensaje. Sin avatar repetido: en una conversación de dos, la
 * cabecera ya dice con quién hablas. Los turnos seguidos del mismo interlocutor
 * se pegan y solo el primero lleva cola.
 *
 * La hora va anclada abajo a la derecha y el texto le deja su hueco con un
 * espaciador al final del último bloque, así no baja una línea entera por ella.
 */
export function ChatMessageItem({
  message,
  grouped = false,
}: {
  message: ChatMessage
  grouped?: boolean
}) {
  const isUser = message.role === 'user'
  const spacer = <span aria-hidden className={TIME_SLOT} />

  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <ChatBubble
        role={message.role}
        withTail={!grouped}
        className="animate-in fade-in-0 slide-in-from-bottom-1"
      >
        <span className="sr-only">{isUser ? 'Tú' : 'Numi'}: </span>
        {isUser ? (
          <p className="whitespace-pre-wrap">
            {message.content}
            {spacer}
          </p>
        ) : (
          <RichText text={message.content} trailing={spacer} />
        )}
        <time
          dateTime={message.at}
          className={cn(
            'absolute right-2.5 bottom-1 text-[0.6rem] tabular-nums',
            isUser ? 'text-chat-bubble-foreground/60' : 'text-muted-foreground',
          )}
        >
          {formatTime(message.at)}
        </time>
      </ChatBubble>
    </div>
  )
}
