import { useNavigate } from 'react-router'
import { Columns3, RotateCcw, ThumbsDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { RichText } from '@/features/assistant/rich-text'
import { formatDateHuman } from '@/lib/format'
import type { PlaygroundRatedMessage } from '@/api/generated/model'
import { usePlaygroundFeedback } from './hooks'

/**
 * **Puntuaciones**: la única señal de calidad que da el producto.
 *
 * Cada entrada trae la respuesta **y la pregunta que la provocó**, y por eso el botón que
 * importa es «volver a correrla»: se lleva esa pregunta y esa organización a la consola,
 * ya cargadas. Sin eso, investigar un pulgar abajo empieza por copiar a mano lo que
 * alguien preguntó hace tres días.
 */
export function FeedbackTab({ feedback }: { feedback: 'up' | 'down' }) {
  const navigate = useNavigate()
  const { messages, isPending, isError, error, refetch } = usePlaygroundFeedback({
    feedback,
    limit: 50,
  })

  return (
    <div className="space-y-3">
      {isError ? (
        <ErrorState
          error={error}
          fallback="No se pudieron cargar las respuestas puntuadas."
          onRetry={() => void refetch()}
        />
      ) : isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : messages.length === 0 ? (
        <EmptyState
          Icon={ThumbsDown}
          title={feedback === 'down' ? 'Nadie ha marcado una respuesta como mala' : 'Todavía no hay pulgares arriba'}
          description="Aparecerán aquí en cuanto alguien puntúe una respuesta de Numi."
        />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {messages.map((message) => (
            <RatedMessage
              key={message.messageId}
              message={message}
              onRerun={() =>
                navigate(
                  `/plataforma/playground?org=${message.organizationId}&mensaje=${encodeURIComponent(
                    message.userMessage ?? '',
                  )}`,
                )
              }
              onCompare={() =>
                navigate(
                  `/plataforma/playground/comparar?mensaje=${encodeURIComponent(
                    message.userMessage ?? '',
                  )}`,
                )
              }
              onWrites={() =>
                navigate(
                  `/plataforma/playground/escrituras?conversacion=${message.conversationId}`,
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}

function RatedMessage({
  message,
  onRerun,
  onCompare,
  onWrites,
}: {
  message: PlaygroundRatedMessage
  onRerun: () => void
  onCompare: () => void
  onWrites: () => void
}) {
  return (
    <article className="space-y-3 rounded-lg border p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="truncate text-sm font-medium">{message.conversationTitle}</h3>
        <span className="text-muted-foreground text-xs">{formatDateHuman(message.createdAt)}</span>
      </header>

      {message.userMessage ? (
        <div className="bg-secondary/60 rounded-lg px-3 py-2 text-sm">
          <p className="text-muted-foreground mb-1 text-xs font-medium">Se le preguntó</p>
          <p className="whitespace-pre-wrap">{message.userMessage}</p>
        </div>
      ) : (
        /* Sin la pregunta no hay nada que volver a correr: se dice, no se ofrece un botón muerto. */
        <p className="text-muted-foreground text-xs">
          No se guardó la pregunta que provocó esta respuesta.
        </p>
      )}

      <div className="text-sm leading-relaxed">
        <RichText text={message.reply} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onRerun} disabled={!message.userMessage}>
          <RotateCcw aria-hidden />
          Volver a correrla
        </Button>
        <Button variant="outline" size="sm" onClick={onCompare} disabled={!message.userMessage}>
          <Columns3 aria-hidden />
          Comparar
        </Button>
        <Button variant="ghost" size="sm" onClick={onWrites}>
          Ver qué escribió
        </Button>
      </div>
    </article>
  )
}
