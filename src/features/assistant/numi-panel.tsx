import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { ChevronRight, RotateCcw, Sparkles, X } from 'lucide-react'
import { canManageOrg } from '@/features/organizations/roles'
import { cn } from '@/lib/utils'
import { SUGGESTIONS } from './constants'
import { AssistantRow, ChatBubble, ChatMessageItem } from './chat-message-item'
import { ChatComposer } from './chat-composer'
import { NumiAvatar } from './numi-avatar'
import { TypingIndicator } from './typing-indicator'
import { useNumiChat } from './hooks'
import { isAwaitingConfirmation } from './utils'
import { NumiLoader } from '@/components/ui/loader'
import { Button } from '@/components/ui/button'

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
      <p className="text-muted-foreground flex items-center gap-1.5 px-1 text-[0.68rem] font-medium tracking-wider uppercase">
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
 * Panel del chat. En móvil ocupa la pantalla; desde `sm` es una tarjeta anclada
 * a la esquina inferior derecha, sobre el contenido (no lo tapa ni lo bloquea:
 * se puede seguir leyendo la pantalla mientras se conversa).
 */
/**
 * Confirmación explícita de una operación propuesta por Numi (§34).
 *
 * El resumen lo escribe Numi en su mensaje —el contrato v1.0.0 devuelve texto
 * plano, no campos—, así que esta barra aporta lo que faltaba: que el sí y el no
 * sean dos botones y no una palabra que hay que acertar. "Confirmar" va como
 * acción primaria; "Cancelar" queda en bajo énfasis porque no destruye nada,
 * solo desiste (§24).
 */
function ConfirmOperationBar({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="bg-card flex flex-wrap items-center gap-2 rounded-xl border p-3 shadow-sm">
      <p className="text-muted-foreground w-full text-xs">
        Numi no registra nada sin tu confirmación.
      </p>
      <Button size="sm" onClick={onConfirm}>
        Confirmar
      </Button>
      <Button size="sm" variant="ghost" onClick={onCancel}>
        Cancelar
      </Button>
    </div>
  )
}

export function NumiPanel({ onClose }: { onClose: () => void }) {
  const { messages, error, isTyping, isHydrating, role, orgName, send, sendAudio, retry, newConversation } =
    useNumiChat()

  // §34: una operación financiera no se confirma escribiendo "ok". Cuando Numi
  // propone una escritura, el sí y el no se ofrecen como botones.
  const last = messages[messages.length - 1]
  const awaitingConfirmation =
    !isTyping && last?.role === 'assistant' && isAwaitingConfirmation(last.content)

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
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3"
      >
        {isHydrating ? (
          <div className="flex h-full items-center justify-center">
            <NumiLoader label="Abriendo la conversación…" compact />
          </div>
        ) : messages.length === 0 ? (
          <>
            <Greeting />
            <QuickStart onPick={(text) => void send(text)} />
          </>
        ) : (
          messages.map((m) => <ChatMessageItem key={m.id} message={m} />)
        )}

        {isTyping && (
          <AssistantRow>
            <ChatBubble role="assistant">
              <TypingIndicator />
            </ChatBubble>
          </AssistantRow>
        )}

        {awaitingConfirmation && (
          <ConfirmOperationBar
            onConfirm={() => void send('Confirmar')}
            onCancel={() => void send('Cancelar')}
          />
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

      <ChatComposer
        onSend={(text) => void send(text)}
        onSendAudio={(blob) => void sendAudio(blob)}
        disabled={isTyping}
        autoFocus
      />
    </div>
  )
}
