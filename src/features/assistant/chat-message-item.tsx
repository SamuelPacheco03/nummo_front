import { type ReactNode } from 'react'
import { AlertCircle, ChevronDown, Clock, Copy, Mic, Quote, ThumbsDown, ThumbsUp } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLongPress } from '@/lib/use-long-press'
import { useTouchInput } from '@/lib/use-touch-input'
import { cn } from '@/lib/utils'
import { AudioPlayer } from './audio-player'
import { NumiAvatar } from './numi-avatar'
import { RichText } from './rich-text'
import { TypingIndicator } from './typing-indicator'
import { splitQuote, type QuoteAuthor } from './quote'
import { formatTime } from './utils'
import type { ChatFeedback, ChatMessage, ChatMessageStatus } from './types'

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
 * Turno de Numi: su cara acompaña a la respuesta para que en un hilo largo se vea de
 * un golpe qué salió del asistente y qué escribiste tú.
 *
 * En una tanda seguida solo la lleva la primera burbuja, y las demás guardan su hueco:
 * repetirla en cada una convierte la conversación en una columna de avatares, y perder
 * el hueco desalinearía el hilo entero.
 */
export function AssistantRow({
  children,
  showAvatar = true,
}: {
  children: ReactNode
  showAvatar?: boolean
}) {
  return (
    <div className="flex w-full items-start gap-2">
      {showAvatar ? (
        <NumiAvatar className="mt-0.5 size-7" />
      ) : (
        <span aria-hidden className="size-7 shrink-0" />
      )}
      <div className="flex min-w-0 max-w-[85%] flex-col items-start">{children}</div>
    </div>
  )
}

/**
 * Qué fue del mensaje, debajo de su burbuja.
 *
 * Solo se dice cuando hay algo que decir: lo entregado no lleva marca, porque en un
 * chat lo normal es que llegue y una palomita en cada línea es ruido. Lo que espera y
 * lo que falló sí, y esto último con la salida al lado.
 */
function MessageStatus({ status, onRetry }: { status?: ChatMessageStatus; onRetry?: () => void }) {
  if (status === 'queued' || status === 'sending') {
    return (
      <p className="text-muted-foreground mt-0.5 flex items-center justify-end gap-1 text-[0.65rem]">
        <Clock aria-hidden className="size-3" />
        {status === 'queued' ? 'En espera' : 'Enviando'}
      </p>
    )
  }
  if (status !== 'failed') return null
  return (
    <p className="text-destructive mt-0.5 flex items-center justify-end gap-1 text-[0.65rem]">
      <AlertCircle aria-hidden className="size-3" />
      No se envió
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="font-medium underline underline-offset-2"
        >
          Reintentar
        </button>
      )}
    </p>
  )
}

/*
  Los menús del chat van con `modal={false}`. Por defecto Radix bloquea el scroll del
  documento mientras uno está abierto, y al desaparecer la barra la página se ensancha y
  salta: abrir un menú movía todo lo de detrás. Además aquí no hay nada que aislar — el
  panel es flotante y lo de atrás se sigue pudiendo leer y usar, que es justo el punto de
  este chat.
*/
/**
 * **El menú del mensaje, en escritorio.**
 *
 * Un chevron en la esquina de la burbuja que aparece al pasar por encima, como el de
 * WhatsApp. Las acciones viven dentro y no sueltas al lado: una fila de iconos flotando
 * junto a cada mensaje ensucia un hilo largo, y aquí solo se ve cuando se va a usar.
 */
function BubbleMenu({
  isUser,
  onCopy,
  onQuote,
}: {
  isUser: boolean
  onCopy: () => void
  onQuote?: () => void
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Opciones del mensaje"
          className={cn(
            'absolute top-0.5 right-0.5 grid size-5 place-items-center rounded transition-opacity',
            'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100',
            isUser
              ? 'text-chat-bubble-foreground/70 hover:text-chat-bubble-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <ChevronDown aria-hidden className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onSelect={onCopy}>
          <Copy />
          Copiar
        </DropdownMenuItem>
        {onQuote && (
          <DropdownMenuItem onSelect={onQuote}>
            <Quote />
            Citar
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Los dos pulgares.
 *
 * En escritorio van al lado de la burbuja y aparecen al pasar por encima; en el móvil
 * salen sobre el mensaje seleccionado, como la fila de reacciones de WhatsApp. En los dos
 * casos **el elegido se queda visible**: ya no es una acción disponible, es un estado del
 * mensaje. Lo dice el relleno del icono y lo dice `aria-pressed`.
 */
function Rating({
  feedback,
  onRate,
  floating = false,
}: {
  feedback?: ChatFeedback
  onRate: (feedback: ChatFeedback) => void
  floating?: boolean
}) {
  const base = floating
    ? 'grid size-8 place-items-center rounded-full transition-colors'
    : 'text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:ring-ring/50 grid size-6 shrink-0 place-items-center rounded-md transition-colors focus-visible:ring-[3px] focus-visible:outline-none'

  return (
    <div
      className={cn(
        'flex items-center gap-0.5',
        floating
          ? 'bg-card animate-in fade-in-0 zoom-in-95 rounded-full border p-1 shadow-lg'
          : cn(
              'self-end transition-opacity group-hover:opacity-100 focus-within:opacity-100',
              feedback ? 'opacity-100' : 'opacity-0',
            ),
      )}
    >
      <button
        type="button"
        onClick={() => onRate('up')}
        aria-label="Buena respuesta"
        title="Buena respuesta"
        aria-pressed={feedback === 'up'}
        className={cn(base, feedback === 'up' ? 'text-success' : 'text-muted-foreground')}
      >
        <ThumbsUp aria-hidden className={cn('size-4', feedback === 'up' && 'fill-current')} />
      </button>
      <button
        type="button"
        onClick={() => onRate('down')}
        aria-label="Mala respuesta"
        title="Mala respuesta"
        aria-pressed={feedback === 'down'}
        className={cn(base, feedback === 'down' ? 'text-destructive' : 'text-muted-foreground')}
      >
        <ThumbsDown aria-hidden className={cn('size-4', feedback === 'down' && 'fill-current')} />
      </button>
    </div>
  )
}

/**
 * Lo citado, dentro de la burbuja de quien responde.
 *
 * Barra de color, quién lo dijo y un recorte de lo dicho — el bloque de WhatsApp. Sale
 * del propio texto del mensaje, que es donde viaja la cita para que Numi también la lea.
 */
function QuotedBlock({ author, quote }: { author: string; quote: string }) {
  return (
    <div className="border-brand bg-foreground/[0.06] mb-1.5 rounded border-l-2 px-2 py-1">
      <p className="text-brand text-xs font-medium">{author}</p>
      <p className="line-clamp-2 text-xs opacity-80">{quote}</p>
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
  onRetry,
  grouped = false,
  onCopy,
  onQuote,
  onRate,
  selected = false,
  onSelect,
}: {
  message: ChatMessage
  /** Trae la URL firmada del audio archivado de este mensaje. */
  loadAudio?: (messageId: string, force?: boolean) => Promise<string>
  /** Vuelve a poner en la cola este mensaje. Los dictados no se reintentan. */
  onRetry?: () => void
  /** Continúa la tanda anterior: no repite la cara de Numi. */
  grouped?: boolean
  onCopy?: (text: string) => void
  /** Solo en las respuestas de Numi: qué opina el usuario de ella. */
  onRate?: (feedback: ChatFeedback) => void
  /** Seleccionado en el móvil: se resalta y saca sus pulgares. */
  selected?: boolean
  /** Mantener pulsado lo selecciona. Solo se ofrece donde se toca con el dedo. */
  onSelect?: (id: string) => void
  /** Solo en las respuestas de Numi: llevar esto al composer para preguntar por ello. */
  onQuote?: (author: QuoteAuthor, text: string) => void
}) {
  const isUser = message.role === 'user'
  const touch = useTouchInput()
  // La cita viaja dentro del texto; aquí se vuelve a separar para pintarla como bloque.
  const quoted = isUser ? splitQuote(message.content) : null
  const spacer = <span aria-hidden className={TIME_SLOT} />

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
        /*
          Solo la nota. **La transcripción no se enseña**: si mandaste un audio
          fue porque no querías escribir, y verlo transcrito de vuelta ocupa el
          doble para decir lo mismo — que Numi conteste a lo que dijiste ya
          prueba que entendió. El texto sigue guardado (es lo que queda cuando
          el audio ya no está), pero no es lo que se lee aquí.
        */
        <AudioPlayer
          src={message.audioUrl}
          load={loadAudio && ((force) => loadAudio(message.id, force))}
          peaks={message.waveform}
          seconds={message.audioSeconds}
          at={message.at}
        />
      ) : isUser ? (
        <>
          {quoted && <QuotedBlock author={quoted.author} quote={quoted.quote} />}
          <p className="whitespace-pre-wrap">
            {message.dictated && (
              <Mic aria-label="Mensaje dictado" className="mr-1 inline size-3 shrink-0 align-[-0.1em] opacity-70" />
            )}
            {quoted ? quoted.text : message.content}
            {spacer}
          </p>
        </>
      ) : message.content === '' ? (
        // Numi ya tiene turno pero todavía no ha dicho nada. Los puntos viven dentro de
        // su burbuja para que la primera palabra los sustituya en el sitio, en vez de
        // hacer saltar el hilo con una fila que desaparece y otra que nace.
        <TypingIndicator />
      ) : (
        <RichText text={message.content} trailing={spacer} />
      )}
      {!playable && message.content !== '' && (
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

  /*
    Ni una nota de voz ni una respuesta a medio escribir se copian o se citan: de la
    primera lo que hay es audio, y de la segunda el texto todavía está cambiando.
  */
  const actionable = !playable && message.content !== '' && Boolean(onCopy)
  const copy = () => onCopy?.(message.content)
  /*
    Se cita a cualquiera, también a uno mismo: volver sobre lo que pediste hace veinte
    mensajes es tan útil como volver sobre lo que Numi contestó. Lo que se cita es el
    texto limpio — citar una cita anidaría bloques sin decir nada nuevo.
  */
  const quote = onQuote
    ? () => onQuote(isUser ? 'Tú' : 'Numi', quoted ? quoted.text : message.content)
    : undefined
  const rateable = !isUser && Boolean(onRate)

  /*
    **Dos interfaces, y no por capricho.** Con ratón hay «encima», así que el menú puede
    esconderse en la esquina de la burbuja y salir al pasar. Con el dedo no lo hay: el
    gesto conocido es mantener pulsado, y lo que aparece entonces son los pulgares sobre
    el mensaje y las acciones arriba, donde WhatsApp las pone.
  */
  const press = useLongPress(() => onSelect?.(message.id))
  const holdable = touch && actionable && onSelect

  const bubbleWithMenu = (
    <div className="relative min-w-0" {...(holdable ? press : {})}>
      {selected && (
        <span
          aria-hidden
          className="bg-brand/10 pointer-events-none absolute -inset-x-2 -inset-y-1 rounded-lg"
        />
      )}
      {bubble}
      {!touch && actionable && <BubbleMenu isUser={isUser} onCopy={copy} onQuote={quote} />}
    </div>
  )

  if (!isUser) {
    return (
      <AssistantRow showAvatar={!grouped}>
        {/* Los pulgares del móvil van sobre el mensaje, no al lado: es donde caben. */}
        {touch && selected && rateable && onRate && (
          <div className="mb-1">
            <Rating feedback={message.feedback} onRate={onRate} floating />
          </div>
        )}
        <div className="group flex w-full min-w-0 items-end gap-1">
          {bubbleWithMenu}
          {!touch && rateable && onRate && <Rating feedback={message.feedback} onRate={onRate} />}
        </div>
      </AssistantRow>
    )
  }

  return (
    <div className="flex w-full flex-col items-end pl-9">
      <div className="group flex max-w-[85%] min-w-0 items-end gap-1">{bubbleWithMenu}</div>
      <MessageStatus
        status={message.status}
        // Reenviar una nota de voz es imposible: su audio era un blob de esta página.
        onRetry={message.dictated ? undefined : onRetry}
      />
    </div>
  )
}
