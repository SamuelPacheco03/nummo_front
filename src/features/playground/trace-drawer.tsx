import { useNavigate } from 'react-router'
import { ListChecks, PenLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { ErrorState } from '@/components/ui/error-state'
import { getErrorMessage } from '@/lib/errors'
import { usePlaygroundRun } from './hooks'
import { TraceMissing, TraceView } from './trace-view'

/**
 * La traza de una corrida **por su id**, para cuando no se tiene el objeto: el historial,
 * un caso de regresión que falló, una escritura que hay que revisar.
 *
 * La consola no lo usa: ahí la traza llega por el propio evento del turno y pedirla otra
 * vez sería una consulta para algo que ya está en la mano.
 */
export function TraceDrawer({ traceId, onClose }: { traceId: string; onClose: () => void }) {
  const { trace, isPending, isError, error } = usePlaygroundRun(traceId)
  const navigate = useNavigate()

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

          {/*
            Las dos salidas de una traza, y son las mismas desde donde se abra: convertirla
            en caso de regresión —«esto salió mal, que no vuelva a pasar»— y ver qué dejó
            escrito. Vivían solo en la consola, y desde el historial hacían la misma falta.
          */}
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
                  navigate(
                    `/plataforma/playground/escrituras?conversacion=${trace.conversationId ?? ''}`,
                  )
                }
              >
                <PenLine aria-hidden />
                Ver qué escribió
              </Button>
            )}
          </div>
        </div>
      ) : (
        !isPending && <TraceMissing />
      )}
    </Drawer>
  )
}
