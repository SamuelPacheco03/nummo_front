import { useState, type FormEvent } from 'react'
import { MessagesSquare, MoreVertical, Pencil, Plus, Search, SearchX, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/ui/empty-state'
import { Field } from '@/components/ui/field'
import { FormDialog } from '@/components/ui/form-dialog'
import { Input } from '@/components/ui/input'
import { Loader, NumiLoader } from '@/components/ui/loader'
import { getErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import type { Conversation } from '@/api/generated/model'
import { MAX_CONVERSATION_TITLE } from './constants'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { useConversationActions, useMessageSearch, useNumiConversations } from './use-numi-history'
import { formatConversationStamp } from './utils'
import type { MessageHit } from '@/api/generated/model'

/*
  Los menús del chat van con `modal={false}`. Por defecto Radix bloquea el scroll del
  documento mientras uno está abierto, y al desaparecer la barra la página se ensancha y
  salta: abrir un menú movía todo lo de detrás. Además aquí no hay nada que aislar — el
  panel es flotante y lo de atrás se sigue pudiendo leer y usar, que es justo el punto de
  este chat.
*/
/**
 * Una conversación de la lista.
 *
 * La fila entera abre —el objetivo grande es el que se usa— y las acciones viven en
 * un menú aparte. Van en su propio botón y no sueltas en la fila porque un «borrar»
 * que se pulsa al querer abrir es justo el error que no se puede deshacer.
 */
function ConversationRow({
  conversation,
  active,
  onOpen,
  onRename,
  onRemove,
}: {
  conversation: Conversation
  active: boolean
  onOpen: () => void
  onRename: () => void
  onRemove: () => void
}) {
  return (
    <li className="group relative">
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          'hover:bg-secondary focus-visible:ring-ring/50 flex w-full items-start gap-3 rounded-lg py-2.5 pr-10 pl-3 text-left transition-colors focus-visible:ring-[3px] focus-visible:outline-none',
          active && 'bg-secondary',
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{conversation.title}</p>
          <p className="text-muted-foreground truncate text-xs">
            {conversation.messageCount} {conversation.messageCount === 1 ? 'mensaje' : 'mensajes'}
          </p>
        </div>
        <span className="text-muted-foreground shrink-0 pt-0.5 text-xs">
          {formatConversationStamp(conversation.lastMessageAt)}
        </span>
      </button>

      <div className="absolute top-1.5 right-1.5">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 pointer-coarse:opacity-100"
              aria-label={'Opciones de ' + conversation.title}
            >
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onSelect={onRename}>
              <Pencil />
              Renombrar
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={onRemove}>
              <Trash2 />
              Borrar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  )
}

/**
 * Un mensaje encontrado.
 *
 * Enseña de qué conversación salió y el trozo alrededor de lo buscado, porque una lista
 * de resultados se escanea: sin el título no se sabe adónde lleva cada fila, y sin el
 * extracto todas se parecen.
 */
function SearchHit({ hit, onOpen }: { hit: MessageHit; onOpen: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="hover:bg-secondary focus-visible:ring-ring/50 w-full rounded-lg px-3 py-2 text-left transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
      >
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-muted-foreground min-w-0 flex-1 truncate text-xs font-medium">
            {hit.conversationTitle}
          </p>
          <span className="text-muted-foreground shrink-0 text-[0.65rem]">
            {formatConversationStamp(hit.createdAt)}
          </span>
        </div>
        <p className="line-clamp-2 text-sm">
          <span className="text-muted-foreground">
            {hit.role === 'assistant' ? 'Numi: ' : 'Tú: '}
          </span>
          {hit.excerpt}
        </p>
      </button>
    </li>
  )
}

/**
 * **Las conversaciones con Numi.**
 *
 * Una por tema: la cartera de septiembre en una, los egresos del mes en otra. Es la
 * vista hermana del hilo dentro del mismo panel —no una barra lateral—, porque en
 * 400px de ancho una barra dejaría el hilo en nada.
 */
export function ConversationList({
  orgId,
  currentId,
  onOpen,
  onNew,
}: {
  orgId: string | undefined
  /** La conversación abierta ahora mismo, para señalarla en la lista. */
  currentId: string | undefined
  /** Con `messageId`, la conversación se abre en ese mensaje. */
  onOpen: (conversationId: string, messageId?: string) => void
  onNew: () => void
}) {
  const [term, setTerm] = useState('')
  // El servidor se consulta cuando se deja de escribir, no en cada tecla.
  const debounced = useDebouncedValue(term.trim(), 300)
  const { hits, isSearching, enabled: searching } = useMessageSearch(orgId, debounced)

  const { conversations, error, isLoading, hasMore, isLoadingMore, loadMore } =
    useNumiConversations(orgId)
  const { rename, remove, isRenaming, isRemoving } = useConversationActions(orgId)

  const [renaming, setRenaming] = useState<Conversation | null>(null)
  const [draft, setDraft] = useState('')
  const [removing, setRemoving] = useState<Conversation | null>(null)

  const startRename = (conversation: Conversation) => {
    setDraft(conversation.title)
    setRenaming(conversation)
  }

  const onSubmitRename = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!renaming) return
    try {
      await rename(renaming.id, draft.trim())
      setRenaming(null)
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo renombrar la conversación'))
    }
  }

  const onConfirmRemove = async () => {
    if (!removing) return
    try {
      await remove(removing.id)
      // Borrar la que se está leyendo dejaría el hilo hablando de algo que ya no existe.
      if (removing.id === currentId) onNew()
      setRemoving(null)
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo borrar la conversación'))
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-2 border-b px-3 py-2">
        <div className="relative">
          <Search
            aria-hidden
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
          />
          <Input
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar en mis conversaciones"
            aria-label="Buscar en mis conversaciones"
            className="pl-8"
          />
        </div>
        {!searching && (
          <Button variant="outline" size="sm" className="w-full" onClick={onNew}>
            <Plus className="size-4" />
            Nueva conversación
          </Button>
        )}
      </div>

      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {searching ? (
          isSearching ? (
            <div className="flex h-full items-center justify-center">
              <NumiLoader label="Buscando…" compact />
            </div>
          ) : hits.length === 0 ? (
            <EmptyState
              Icon={SearchX}
              title="Sin resultados"
              description={`No encontré "${debounced}" en tus conversaciones.`}
            />
          ) : (
            <ul className="space-y-0.5">
              {hits.map((hit) => (
                <SearchHit
                  key={hit.messageId}
                  hit={hit}
                  onOpen={() => onOpen(hit.conversationId, hit.messageId)}
                />
              ))}
            </ul>
          )
        ) : isLoading ? (
          <div className="flex h-full items-center justify-center">
            <NumiLoader label="Buscando tus conversaciones…" compact />
          </div>
        ) : error ? (
          <p className="text-destructive px-3 py-6 text-center text-sm">
            {getErrorMessage(error, 'No se pudieron cargar las conversaciones.')}
          </p>
        ) : conversations.length === 0 ? (
          <EmptyState
            Icon={MessagesSquare}
            title="Todavía no hay conversaciones"
            description="Cuando le escribas a Numi, cada tema quedará guardado aquí."
          />
        ) : (
          <>
            <ul className="space-y-0.5">
              {conversations.map((c) => (
                <ConversationRow
                  key={c.id}
                  conversation={c}
                  active={c.id === currentId}
                  onOpen={() => onOpen(c.id)}
                  onRename={() => startRename(c)}
                  onRemove={() => setRemoving(c)}
                />
              ))}
            </ul>
            {hasMore && (
              <div className="flex justify-center py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void loadMore()}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore && <Loader size="sm" />}
                  Ver más
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <FormDialog
        open={renaming !== null}
        onOpenChange={(open) => !open && setRenaming(null)}
        title="Renombrar conversación"
        description="El nombre que trae lo saca Numi del primer mensaje. Ponle el tuyo."
        loading={isRenaming}
        onSubmit={(event) => void onSubmitRename(event)}
      >
        <Field label="Nombre" htmlFor="conv-title" required>
          <Input
            id="conv-title"
            value={draft}
            autoFocus
            maxLength={MAX_CONVERSATION_TITLE}
            onChange={(e) => setDraft(e.target.value)}
          />
        </Field>
      </FormDialog>

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="¿Borrar esta conversación?"
        description={
          removing
            ? removing.title +
              ' dejará de aparecer y no podrás volver a abrirla. Lo que Numi haya registrado se queda: los movimientos no se borran.'
            : undefined
        }
        confirmLabel="Borrar"
        destructive
        loading={isRemoving}
        onConfirm={() => void onConfirmRemove()}
      />
    </div>
  )
}
