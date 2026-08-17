import { useState, type ReactNode } from 'react'
import { Captions, Mic } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AudioPlayer } from './audio-player'
import { NumiAvatar } from './numi-avatar'
import { RichText } from './rich-text'
import { formatTime } from './utils'
import type { ChatMessage } from './types'

/**
 * Burbuja del hilo: superficie redondeada, la de Numi sobre tarjeta con borde y
 * la propia con el azul lavado del chat. Sin cola — quien habla se distingue
 * por el lado y, del lado de Numi, por su cara.
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
        'relative max-w-full rounded-xl px-3 py-2 text-sm leading-relaxed break-words',
        isUser
          ? 'bg-chat-bubble text-chat-bubble-foreground'
          : 'bg-card text-card-foreground border shadow-sm',
        className,
      )}
    >
      {children}
    </div>
  )
}

/**
 * Turno de Numi: su cara acompaña SIEMPRE a la respuesta, para que en un hilo
 * largo se vea de un golpe qué salió del asistente y qué escribiste tú.
 */
export function AssistantRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full items-start gap-2">
      <NumiAvatar className="mt-0.5 size-7" />
      <div className="flex min-w-0 max-w-[85%] flex-col items-start">{children}</div>
    </div>
  )
}

/** Ancho que la hora reserva al final de la última línea del mensaje. */
const TIME_SLOT = 'inline-block w-[3.4rem] align-baseline'

/**
 * Fila de un mensaje. La hora va anclada abajo a la derecha y el texto le deja
 * su hueco con un espaciador al final del último bloque, así no baja una línea
 * entera por ella.
 */
export function ChatMessageItem({
  message,
  loadAudio,
}: {
  message: ChatMessage
  /** Trae la URL firmada del audio archivado de este mensaje. */
  loadAudio?: (messageId: string, force?: boolean) => Promise<string>
}) {
  const isUser = message.role === 'user'
  const spacer = <span aria-hidden className={TIME_SLOT} />
  const [showTranscript, setShowTranscript] = useState(false)

  /*
    Suena si el audio está aquí (recién grabado) o si el servidor lo guarda y
    puede firmar una URL. Un mensaje dictado cuyo audio ya no existe se lee como
    lo que queda de él: su transcripción, con el micrófono que dice de dónde
    salió.
  */
  const playable = Boolean(message.audioUrl) || Boolean(message.hasAudio && loadAudio)

  const bubble = (
    <ChatBubble role={message.role} className="animate-in fade-in-0 slide-in-from-bottom-1">
      <span className="sr-only">{isUser ? 'Tú' : 'Numi'}: </span>
      {playable ? (
        <>
          {/* La nota de voz muestra su propia duración y hora bajo la onda. */}
          <AudioPlayer
            src={message.audioUrl}
            load={loadAudio && ((force) => loadAudio(message.id, force))}
            peaks={message.waveform}
            seconds={message.audioSeconds}
            at={message.at}
          />
          {/*
            La transcripción **no sale sola**. Una nota de voz con su texto
            debajo se lee dos veces y ocupa el doble: si mandaste un audio es
            porque no querías escribir, y verlo transcrito de vuelta sobra
            —salvo cuando hace falta, y entonces está a un toque—.
          */}
          {message.content && (
            <>
              {showTranscript && (
                <p className="mt-1.5 text-[0.8rem] leading-snug whitespace-pre-wrap opacity-80">
                  {message.content}
                </p>
              )}
              <button
                type="button"
                onClick={() => setShowTranscript((v) => !v)}
                className="mt-1.5 flex items-center gap-1 text-[0.7rem] font-medium opacity-70 transition-opacity hover:opacity-100"
              >
                <Captions aria-hidden className="size-3.5" />
                {showTranscript ? 'Ocultar transcripción' : 'Transcribir'}
              </button>
            </>
          )}
        </>
      ) : isUser ? (
        <p className="whitespace-pre-wrap">
          {message.dictated && (
            <Mic aria-label="Mensaje dictado" className="mr-1 inline size-3 shrink-0 align-[-0.1em] opacity-70" />
          )}
          {message.content}
          {spacer}
        </p>
      ) : (
        <RichText text={message.content} trailing={spacer} />
      )}
      {!playable && (
        <time
          dateTime={message.at}
          className={cn(
            'absolute right-3 bottom-1.5 text-[0.6rem] tabular-nums',
            isUser ? 'text-chat-bubble-foreground/60' : 'text-muted-foreground',
          )}
        >
          {formatTime(message.at)}
        </time>
      )}
    </ChatBubble>
  )

  if (!isUser) return <AssistantRow>{bubble}</AssistantRow>

  return <div className="flex w-full justify-end pl-9">{bubble}</div>
}
