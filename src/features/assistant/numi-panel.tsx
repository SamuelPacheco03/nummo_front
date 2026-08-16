import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { canManageOrg } from '@/features/organizations/roles'
import { SUGGESTIONS } from './constants'
import { ChatBubble, ChatMessageItem } from './chat-message-item'
import { ChatComposer } from './chat-composer'
import { NumiAvatar } from './numi-avatar'
import { TypingIndicator } from './typing-indicator'
import { useNumiChat } from './hooks'

/** Estado vacío: qué es Numi y tres arranques para no mirar una caja en blanco. */
function EmptyState({ onPick, canConfigure }: { onPick: (text: string) => void; canConfigure: boolean }) {
  return (
    <div className="space-y-4 py-4 text-center">
      <NumiAvatar className="mx-auto size-11" />
      <div className="space-y-1">
        <p className="font-display text-base font-semibold">Hola, soy Numi</p>
        <p className="text-sm text-muted-foreground">
          Consulto tus cifras y también registro operaciones. Antes de guardar algo te muestro un
          resumen y espero tu confirmación.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
          >
            {s}
          </button>
        ))}
      </div>
      {canConfigure && (
        <p className="text-xs text-muted-foreground">
          ¿Numi no responde?{' '}
          <Link to="/config/asistente" className="text-brand underline-offset-4 hover:underline">
            Configura el proveedor de IA
          </Link>
          .
        </p>
      )}
    </div>
  )
}

/**
 * Panel del chat. En móvil ocupa la pantalla; desde `sm` es una tarjeta anclada
 * a la esquina inferior derecha, sobre el contenido (no lo tapa ni lo bloquea:
 * se puede seguir leyendo la pantalla mientras se conversa).
 */
export function NumiPanel({ onClose }: { onClose: () => void }) {
  const { messages, error, isTyping, role, send, retry, newConversation } = useNumiChat()
  const listRef = useRef<HTMLDivElement>(null)

  // El hilo siempre pegado abajo: hay que escribir el scroll del DOM.
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, isTyping, error])

  return (
    <div
      role="dialog"
      aria-label="Numi, asistente de Nummo"
      className="animate-in fade-in-0 slide-in-from-bottom-4 bg-card text-card-foreground fixed inset-0 z-50 flex flex-col shadow-2xl duration-200 sm:inset-auto sm:right-4 sm:bottom-4 sm:h-[min(36rem,calc(100dvh-6rem))] sm:w-96 sm:rounded-xl sm:border"
    >
      <header className="flex items-center gap-2 border-b px-3 py-2.5">
        <NumiAvatar />
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-semibold">Numi</p>
          <p className="truncate text-xs text-muted-foreground">Asistente de Nummo</p>
        </div>
        {messages.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={newConversation}
            aria-label="Nueva conversación"
            title="Nueva conversación"
          >
            <RotateCcw className="size-4" />
          </Button>
        )}
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar el chat">
          <X className="size-4" />
        </Button>
      </header>

      <div
        ref={listRef}
        role="log"
        aria-live="polite"
        aria-label="Conversación con Numi"
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3"
      >
        {messages.length === 0 ? (
          <EmptyState onPick={(text) => void send(text)} canConfigure={canManageOrg(role)} />
        ) : (
          messages.map((m) => <ChatMessageItem key={m.id} message={m} />)
        )}

        {isTyping && (
          <ChatBubble role="assistant">
            <TypingIndicator />
          </ChatBubble>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            <p>{error.message}</p>
            {error.needsSetup && canManageOrg(role) ? (
              <Link
                to="/config/asistente"
                onClick={onClose}
                className="mt-1 inline-block font-medium underline underline-offset-4"
              >
                Ir a Configuración
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => void retry()}
                className="mt-1 font-medium underline underline-offset-4"
              >
                Reintentar
              </button>
            )}
          </div>
        )}
      </div>

      <ChatComposer onSend={(text) => void send(text)} disabled={isTyping} autoFocus />
    </div>
  )
}
