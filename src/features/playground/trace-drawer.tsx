import { useNavigate } from 'react-router'
import { ListChecks, PenLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { ErrorState } from '@/components/ui/error-state'
import { getErrorMessage } from '@/lib/errors'
import type { PlaygroundTrace } from '@/api/generated/model'
import { usePlaygroundRun } from './hooks'
import { TraceMissing, TraceView } from './trace-view'

/**
 * **Cómo se abre una traza**, y es igual desde donde se abra: la consola, la comparación,
 * un caso de regresión que falló, una escritura que hay que revisar.
 *
 * Son dos puertas para lo mismo, según lo que tenga quien la abre:
 *
 * - `TracePanel` — ya tiene la traza en la mano (llegó por el evento del turno).
 * - `TraceDrawer` — solo tiene su id, así que la pide.
 *
 * Y una sola pantalla detrás. Antes eran cuatro copias del mismo cajón, y las salidas
 * —guardar el caso, ver qué escribió— estaban en tres de ellas.
 */
export function TracePanel({
  trace,
  label,
  onClose,
}: {
  /** `null` es «el turno contestó pero no dejó medida», que no es un fallo. */
  trace: PlaygroundTrace | null
  /** Nombre de la variante, cuando se compara. */
  label?: string
  onClose: () => void
}) {
  return (
    <Drawer
      open
      onOpenChange={(open) => !open && onClose()}
      title={label ? `Traza · ${label}` : 'Traza del turno'}
      meta={trace?.model}
    >
      <div className="space-y-5">
        {trace ? <TraceView trace={trace} /> : <TraceMissing />}
        {trace && <TraceActions trace={trace} />}
      </div>
    </Drawer>
  )
}

export function TraceDrawer({ traceId, onClose }: { traceId: string; onClose: () => void }) {
  const { trace, isPending, isError, error } = usePlaygroundRun(traceId)

  return (
    <Drawer
      open
      onOpenChange={(open) => !open && onClose()}
      title="Traza del turno"
      meta={trace?.model}
      loading={isPending}
      error={isError ? getErrorMessage(error, 'No se pudo cargar la traza.') : null}
    >
      {isError ? (
        <ErrorState error={error} fallback="No se pudo cargar la traza." />
      ) : trace ? (
        <div className="space-y-5">
          <TraceView trace={trace} />
          <TraceActions trace={trace} />
        </div>
      ) : (
        !isPending && <TraceMissing />
      )}
    </Drawer>
  )
}

/**
 * Las dos salidas de una traza.
 *
 * «Esto salió mal, que no vuelva a pasar» es el camino por el que de verdad crece un
 * conjunto de regresión, y por eso el botón vive aquí y no en la lista de casos: cuando
 * se piensa el caso, se está mirando esto.
 */
function TraceActions({ trace }: { trace: PlaygroundTrace }) {
  const navigate = useNavigate()

  return (
    <div className="flex flex-wrap gap-2 border-t pt-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate(`/plataforma/playground/regresion?traza=${trace.id}`)}
      >
        <ListChecks aria-hidden />
        Guardar como caso
      </Button>
      {trace.conversationId && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            navigate(`/plataforma/playground/escrituras?conversacion=${trace.conversationId ?? ''}`)
          }
        >
          <PenLine aria-hidden />
          Ver qué escribió
        </Button>
      )}
    </div>
  )
}
