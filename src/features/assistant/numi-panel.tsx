import { useState } from 'react'
import { ArrowLeft, MessagesSquare, RotateCcw, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChatComposer } from './chat-composer'
import { ChatThread } from './chat-thread'
import { ConversationList } from './conversation-list'
import { NumiAvatar } from './numi-avatar'
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

/**
 * Panel del chat. En móvil ocupa la pantalla; desde `sm` es una tarjeta anclada
 * a la esquina inferior derecha, sobre el contenido (no lo tapa ni lo bloquea:
 * se puede seguir leyendo la pantalla mientras se conversa).
 *
 * Tiene dos vistas y el panel es quien decide cuál: el hilo y la lista de
 * conversaciones. La lista **entra en el propio panel**, como en WhatsApp, y no
 * como barra lateral: en 25rem de ancho una barra dejaría el hilo en nada.
 *
 * Cuál se ve es estado de esta pantalla y vive aquí, no en el store: el store
 * guarda de qué se está hablando, que es lo que tiene que sobrevivir a cerrar el
 * chat. Volver a abrirlo en el hilo es lo que se espera de un asistente.
 */
export function NumiPanel({ onClose }: { onClose: () => void }) {
  const {
    messages,
    error,
    isTyping,
    isHydrating,
    role,
    orgId,
    orgName,
    conversationId,
    send,
    sendAudio,
    retry,
    newConversation,
    openConversation,
    loadAudio,
    hasOlder,
    isLoadingOlder,
    loadOlder,
  } = useNumiChat()

  const [showingList, setShowingList] = useState(false)

  const openFromList = async (id: string) => {
    await openConversation(id)
    setShowingList(false)
  }

  const startNew = () => {
    newConversation()
    setShowingList(false)
  }

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
        {showingList ? (
          <>
            <HeaderAction
              label="Volver a la conversación"
              Icon={ArrowLeft}
              onClick={() => setShowingList(false)}
            />
            <p className="font-display min-w-0 flex-1 text-sm leading-tight font-semibold">
              Conversaciones
            </p>
          </>
        ) : (
          <>
            <NumiAvatar className="size-9" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm leading-tight font-semibold">Numi</p>
              <p className="text-muted-foreground truncate text-xs leading-tight">
                {orgName ?? 'Asistente de Nummo'}
              </p>
            </div>
            <HeaderAction
              label="Ver mis conversaciones"
              Icon={MessagesSquare}
              onClick={() => setShowingList(true)}
            />
            {messages.length > 0 && (
              <HeaderAction label="Nueva conversación" Icon={RotateCcw} onClick={startNew} />
            )}
          </>
        )}
        <HeaderAction label="Cerrar el chat" Icon={X} onClick={onClose} />
      </header>

      {showingList ? (
        <ConversationList
          orgId={orgId}
          currentId={conversationId}
          onOpen={(id) => void openFromList(id)}
          onNew={startNew}
        />
      ) : (
        <>
          <ChatThread
            messages={messages}
            error={error}
            isTyping={isTyping}
            isHydrating={isHydrating}
            role={role}
            hasOlder={hasOlder}
            isLoadingOlder={isLoadingOlder}
            loadOlder={() => void loadOlder()}
            send={(text) => void send(text)}
            retry={() => void retry()}
            loadAudio={loadAudio}
            onLeave={onClose}
          />
          <ChatComposer
            onSend={(text) => void send(text)}
            onSendAudio={(blob) => void sendAudio(blob)}
            disabled={isTyping}
            autoFocus
          />
        </>
      )}
    </div>
  )
}
