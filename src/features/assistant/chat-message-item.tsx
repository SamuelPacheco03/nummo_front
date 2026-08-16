import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { RichText } from './rich-text'
import { formatTime } from './utils'
import type { ChatMessage } from './types'

/**
 * Burbuja del hilo, al modo de un chat de mensajería: la primera de cada
 * tanda lleva cola hacia su lado y la hora va DENTRO, abajo a la derecha —
 * el texto fluye alrededor gracias al float, así los mensajes cortos no
 * arrastran una línea extra solo para la hora.
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
        isUser ? 'bg-primary text-primary-foreground' : 'bg-card text-card-foreground',
        withTail && [
          'before:absolute before:top-0 before:size-0 before:border-t-8',
          isUser
            ? 'rounded-tr-none before:-right-2 before:border-r-8 before:border-t-primary before:border-r-transparent'
            : 'rounded-tl-none before:-left-2 before:border-l-8 before:border-t-card before:border-l-transparent',
        ],
        className,
      )}
    >
      {children}
    </div>
  )
}

/**
 * Fila de un mensaje. Sin avatar repetido en el hilo: en una conversación de
 * dos, la cabecera ya dice con quién hablas; los turnos seguidos del mismo
 * interlocutor se pegan y solo el primero lleva cola.
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
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <ChatBubble
        role={message.role}
        withTail={!grouped}
        className="animate-in fade-in-0 slide-in-from-bottom-1"
      >
        <time
          dateTime={message.at}
          className={cn(
            'float-right mt-1.5 ml-2 text-[0.6rem] tabular-nums',
            isUser ? 'text-primary-foreground/70' : 'text-muted-foreground',
          )}
        >
          {formatTime(message.at)}
        </time>
        <span className="sr-only">{isUser ? 'Tú' : 'Numi'}: </span>
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <RichText text={message.content} />
        )}
      </ChatBubble>
    </div>
  )
}
