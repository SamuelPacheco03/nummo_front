import { useCallback, useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router'
import { ChevronRight, Sparkles } from 'lucide-react'
import { useCan } from '@/features/platform/permissions'
import { Loader, NumiLoader } from '@/components/ui/loader'
import { SUGGESTIONS } from './constants'
import { AssistantRow, ChatBubble, ChatMessageItem } from './chat-message-item'
import { isRetryable } from './numi-error'
import type { ChatMessage, NumiError } from './types'

/** A qué distancia del borde superior se empieza a traer la página anterior. */
const LOAD_OLDER_MARGIN = 80

/**
 * Apertura del hilo: el saludo entra como un mensaje recibido de Numi (misma
 * burbuja, misma cara que sus respuestas) y debajo los arranques sugeridos,
 * para no abrir sobre una caja vacía.
 */
function Greeting() {
  return (
    <AssistantRow>
      <ChatBubble role="assistant">
        <p className="font-display mb-1 text-sm font-semibold">
          Hola, soy <span className="text-brand">Numi</span>
        </p>
        <p className="text-muted-foreground">
          Consulto tus cifras y registro operaciones por chat. Antes de guardar algo te muestro un
          resumen y espero tu confirmación.
        </p>
      </ChatBubble>
    </AssistantRow>
  )
}

function QuickStart({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="space-y-2 pt-1">
      <p className="text-muted-foreground flex items-center gap-1.5 px-1 text-xs font-medium">
        <Sparkles className="size-3.5" />
        Para empezar
      </p>
      <div className="flex flex-col gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="bg-card hover:border-brand/40 hover:bg-secondary focus-visible:ring-ring/50 flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm shadow-sm transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
          >
            <span className="min-w-0 flex-1">{s}</span>
            <ChevronRight className="text-muted-foreground size-4 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Aviso de que arriba queda conversación. Es un botón de verdad, no solo un
 * indicador: subir con el dedo la trae sola, pero con teclado no hay «subir».
 */
function OlderMessages({ loading, onLoad }: { loading: boolean; onLoad: () => void }) {
  if (loading) {
    return (
      <p className="text-muted-foreground flex items-center justify-center gap-2 py-1 text-xs">
        <Loader size="sm" />
        Cargando mensajes anteriores…
      </p>
    )
  }
  return (
    <div className="flex justify-center py-1">
      <button
        type="button"
        onClick={onLoad}
        className="text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:ring-ring/50 rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
      >
        Ver mensajes anteriores
      </button>
    </div>
  )
}

/**
 * Por qué se cortó el turno, y qué puede hacer quien lo lee.
 *
 * Reintentar **no** vive aquí: cuelga del mensaje que falló, que es lo que se quiere
 * reenviar. Y solo aparece cuando puede funcionar — sin proveedor, sin cuota o sin
 * plan, volver a mandar lo mismo falla igual.
 */
function ThreadError({ error, onLeave }: { error: NumiError; onLeave: () => void }) {
  /*
    Dos permisos y no uno: configurar el asistente lo hace quien administra la
    organización, y el plan lo lleva quien es su propietario. Eran el mismo
    predicado de rol y el contrato los separa (§88.5).
  */
  const can = useCan()
  const canSetUp = can('assistant.settings.manage')
  const canUpgrade = can('subscription.manage')
  return (
    <div className="border-destructive/40 bg-destructive/5 text-destructive rounded-lg border px-3 py-2 text-xs">
      <p>{error.message}</p>
      {error.kind === 'setup' && canSetUp && (
        <Link
          to="/config/asistente"
          onClick={onLeave}
          className="mt-1 inline-block font-medium underline underline-offset-4"
        >
          Ir a Configuración
        </Link>
      )}
      {(error.kind === 'quota' || error.kind === 'plan') && (
        <p className="mt-1 opacity-90">
          {canUpgrade
            ? 'Amplía el plan de la organización para seguir usando esto.'
            : 'Pídeselo a quien lleve el plan de la organización.'}
        </p>
      )}
    </div>
  )
}

export interface ChatThreadProps {
  messages: ChatMessage[]
  error: NumiError | null
  isTyping: boolean
  isHydrating: boolean
  hasOlder: boolean
  isLoadingOlder: boolean
  loadOlder: () => void
  send: (text: string) => void
  /** Devuelve a la cola el mensaje que no salió. */
  retryMessage: (id: string) => void
  loadAudio: (messageId: string, force?: boolean) => Promise<string>
  /** El enlace a Configuración sale del panel, así que hay que cerrarlo al seguirlo. */
  onLeave: () => void
}

/**
 * **El hilo de la conversación.**
 *
 * Se ocupa de una sola cosa y es la que tiene truco: mantener la vista donde el
 * usuario la dejó. Pegada abajo mientras se conversa, y quieta en su sitio cuando
 * entra historia por arriba.
 */
export function ChatThread({
  messages,
  error,
  isTyping,
  isHydrating,
  hasOlder,
  isLoadingOlder,
  loadOlder,
  send,
  retryMessage,
  loadAudio,
  onLeave,
}: ChatThreadProps) {
  const listRef = useRef<HTMLDivElement>(null)
  /**
   * Dónde estaba la vista justo antes de pedir la página anterior. Insertar
   * mensajes por arriba empuja hacia abajo todo lo demás: sin esto, subir a leer
   * lo de ayer te deja mirando un punto distinto del que estabas leyendo.
   */
  const anchor = useRef<{ height: number; top: number; count: number } | null>(null)

  const onLoadOlder = useCallback(() => {
    const el = listRef.current
    if (el) anchor.current = { height: el.scrollHeight, top: el.scrollTop, count: messages.length }
    loadOlder()
  }, [loadOlder, messages.length])

  // Antes de pintar, no después: corregir el scroll en un `useEffect` se vería
  // como un salto.
  useLayoutEffect(() => {
    const el = listRef.current
    if (!el) return
    const held = anchor.current
    if (held) {
      // Todavía no ha llegado nada; quedarse quieto es lo correcto, y bajar al
      // fondo sería justo lo contrario de lo que se pidió.
      if (messages.length === held.count) return
      el.scrollTop = held.top + (el.scrollHeight - held.height)
      anchor.current = null
      return
    }
    el.scrollTop = el.scrollHeight
  }, [messages, isTyping, error])

  /*
    Reintentar solo cuando puede funcionar. El mensaje que falló y el motivo del fallo
    son la misma historia contada en dos sitios: sin proveedor, sin cuota o sin plan,
    el botón de la burbuja mandaría a chocar contra la misma pared que el aviso de
    abajo acaba de explicar. Sin motivo a la vista —un fallo viejo que volvió del
    almacenamiento— se ofrece, que es lo que se puede hacer con él.
  */
  const canRetry = !error || isRetryable(error)

  // Y lo natural: llegar arriba trae lo anterior sin pedirlo.
  const onScroll = useCallback(() => {
    const el = listRef.current
    if (!el || !hasOlder || isLoadingOlder) return
    if (el.scrollTop < LOAD_OLDER_MARGIN) onLoadOlder()
  }, [hasOlder, isLoadingOlder, onLoadOlder])

  return (
    <div
      ref={listRef}
      onScroll={onScroll}
      role="log"
      aria-live="polite"
      aria-label="Conversación con Numi"
      className="scrollbar-slim min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3"
    >
      {isHydrating ? (
        <div className="flex h-full items-center justify-center">
          <NumiLoader label="Abriendo la conversación…" compact />
        </div>
      ) : messages.length === 0 ? (
        <>
          <Greeting />
          <QuickStart onPick={send} />
        </>
      ) : (
        <>
          {hasOlder && <OlderMessages loading={isLoadingOlder} onLoad={onLoadOlder} />}
          {messages.map((m) => (
            <ChatMessageItem
              key={m.id}
              message={m}
              loadAudio={loadAudio}
              onRetry={canRetry ? () => retryMessage(m.id) : undefined}
            />
          ))}
        </>
      )}

      {error && <ThreadError error={error} onLeave={onLeave} />}
    </div>
  )
}
