import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { ChevronRight, RotateCcw, X } from 'lucide-react'
import { canManageOrg } from '@/features/organizations/roles'
import { cn } from '@/lib/utils'
import { SUGGESTIONS } from './constants'
import { ChatBubble, ChatMessageItem } from './chat-message-item'
import { ChatComposer } from './chat-composer'
import { NumiAvatar } from './numi-avatar'
import { TypingIndicator } from './typing-indicator'
import { useNumiChat } from './hooks'

/** Botón de la cabecera: icono suelto, sin peso visual. */
function HeaderAction({
  label,
  Icon,
  onClick,
}: {
  label: string
  Icon: typeof X
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:ring-ring/50 grid size-8 place-items-center rounded-md transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
    >
      <Icon className="size-4" />
    </button>
  )
}

/** Presentación de Numi y tres arranques, para no abrir sobre una caja vacía. */
function EmptyState({
  onPick,
  canConfigure,
}: {
  onPick: (text: string) => void
  canConfigure: boolean
}) {
  return (
    <div className="space-y-5 py-2">
      <div className="flex gap-3">
        <NumiAvatar className="mt-0.5 size-8" />
        <div className="space-y-1">
          <p className="font-display text-sm font-semibold">Hola, soy Numi</p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Consulto tus cifras y registro operaciones por chat. Antes de guardar algo te muestro un
            resumen y espero tu confirmación.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-muted-foreground px-0.5 text-[0.68rem] font-medium tracking-wider uppercase">
          Para empezar
        </p>
        <div className="divide-border bg-card divide-y overflow-hidden rounded-lg border">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onPick(s)}
              className="hover:bg-secondary focus-visible:ring-ring/50 flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors focus-visible:ring-[3px] focus-visible:outline-none focus-visible:-outline-offset-1"
            >
              <span className="min-w-0 flex-1 truncate">{s}</span>
              <ChevronRight className="text-muted-foreground size-4 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {canConfigure && (
        <p className="text-muted-foreground text-xs">
          ¿Numi no responde?{' '}
          <Link to="/config/asistente" className="text-brand underline-offset-4 hover:underline">
            Revisa el proveedor de IA
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
  const { messages, error, isTyping, role, orgName, send, retry, newConversation } = useNumiChat()
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
      className={cn(
        'bg-background text-foreground fixed inset-0 z-50 flex flex-col',
        'animate-in fade-in-0 slide-in-from-bottom-4 duration-200',
        'sm:inset-auto sm:right-4 sm:bottom-4 sm:h-[min(38rem,calc(100dvh-6rem))] sm:w-[25rem] sm:rounded-lg sm:border sm:shadow-xl',
      )}
    >
      <header className="bg-card flex items-center gap-2.5 border-b px-3 py-2.5 sm:rounded-t-lg">
        <NumiAvatar className="size-9" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm leading-tight font-semibold">Numi</p>
          <p className="text-muted-foreground truncate text-xs leading-tight">
            {orgName ?? 'Asistente de Nummo'}
          </p>
        </div>
        {messages.length > 0 && (
          <HeaderAction label="Nueva conversación" Icon={RotateCcw} onClick={newConversation} />
        )}
        <HeaderAction label="Cerrar el chat" Icon={X} onClick={onClose} />
      </header>

      <div
        ref={listRef}
        role="log"
        aria-live="polite"
        aria-label="Conversación con Numi"
        className={cn(
          'min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 py-3',
          // Papel de la conversación: puntos casi invisibles sobre el fondo, el
          // guiño al chat de mensajería sin meter una imagen de fondo.
          'bg-[radial-gradient(var(--border)_0.5px,transparent_0.5px)] bg-[size:14px_14px]',
        )}
      >
        {messages.length === 0 ? (
          <EmptyState onPick={(text) => void send(text)} canConfigure={canManageOrg(role)} />
        ) : (
          messages.map((m, i) => {
            const grouped = messages[i - 1]?.role === m.role
            return (
              <div key={m.id} className={cn(!grouped && i > 0 && 'pt-2')}>
                <ChatMessageItem message={m} grouped={grouped} />
              </div>
            )
          })
        )}

        {isTyping && (
          <div className="flex justify-start pt-2">
            <ChatBubble role="assistant">
              <TypingIndicator />
            </ChatBubble>
          </div>
        )}

        {error && (
          <div className="border-destructive/40 bg-destructive/5 text-destructive rounded-lg border px-3 py-2 text-xs">
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

      <p className="text-muted-foreground bg-card px-3 pb-2 text-center text-[0.65rem] sm:rounded-b-lg">
        Numi pide confirmación antes de registrar cualquier operación.
      </p>
    </div>
  )
}
