import { useState } from 'react'
import { Link } from 'react-router'
import { Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader } from '@/components/ui/loader'
import { toastApiError } from '@/features/platform/errors'
import { isApiStatus } from '@/lib/errors'
import { plural } from '@/lib/format'
import type { CollectionRemindersRun } from '@/api/generated/model'
import { useRunCollectionReminders } from './hooks'

/**
 * **«Enviar ahora»** — disparar la pasada de recordatorios sin esperar a la hora.
 *
 * Existe por un caso muy concreto: el escaneo corre **una sola vez al día**, a la
 * hora local de la organización, así que activar la cobranza a las once significa
 * que el primer aviso sale mañana. Sin este botón eso se siente roto.
 *
 * Tres decisiones que salen de cómo se comporta el backend:
 *
 * 1. **No se deshabilita «por si acaso» ni avisa de que ya se pulsó.** Pulsarlo
 *    dos veces no duplica nada, y lo garantiza la clave de deduplicación de cada
 *    mensaje. La segunda pulsación devuelve `overdue: 1, queued: 0`, que **no es
 *    un error**: significa «ya estaba dicho».
 * 2. **El resultado no va en un aviso.** Son seis cifras que hay que leer y
 *    comparar, y §40 reserva el toast para lo que no se estudia.
 * 3. **Encola, no envía.** El worker despacha después, así que el texto no puede
 *    decir «enviados»: dice encolados, y remite al historial.
 *
 * Solo se ofrece con la política **guardada** como activa: apagada, el endpoint
 * responde 409 y el botón no tendría sentido.
 */
export function RunNowPanel({ orgId, canRun }: { orgId: string | undefined; canRun: boolean }) {
  const run = useRunCollectionReminders(orgId ?? '')
  const [result, setResult] = useState<CollectionRemindersRun | null>(null)

  const onRun = async () => {
    if (!orgId) return
    try {
      const response = await run.mutateAsync({ orgId })
      setResult(response.data as CollectionRemindersRun)
    } catch (err) {
      /*
        La política se apagó entre que se pintó el botón y se pulsó. Va con
        mensaje propio y no por `toastApiError`: ese prefiere el del API, y el
        backend manda «disabled» — cierto, pero no es una frase para nadie.
      */
      if (isApiStatus(err, 409)) {
        toast.error('La cobranza está apagada', {
          description: 'Enciéndela y guarda la política antes de disparar la pasada.',
        })
        return
      }
      toastApiError(err, 'No se pudo correr la pasada')
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Los recordatorios salen una vez al día</p>
            <p className="text-muted-foreground text-xs">
              A la hora de los recordatorios de la organización. Si acabas de encender la cobranza
              y no quieres esperar a mañana, dispara la pasada ahora.{' '}
              <Link to="/config/avisos" className="text-brand underline">
                Ver la hora
              </Link>
            </p>
          </div>

          {canRun && (
            <Button variant="outline" onClick={() => void onRun()} disabled={run.isPending}>
              {run.isPending ? <Loader className="size-4" /> : <Send className="size-4" />}
              Enviar ahora
            </Button>
          )}
        </div>

        {result && <RunResult result={result} />}
      </CardContent>
    </Card>
  )
}

/**
 * Lo que hizo la pasada, y **por qué salieron menos de los que esperabas**.
 *
 * `withoutPhone` y `overdueDeferred` son la respuesta a «pedí avisar a treinta y
 * salieron doce»: un cero sin explicación al lado parece un fallo del sistema, y
 * lo que hay detrás casi siempre es un contacto sin teléfono o una hora de
 * silencio que aplazó el envío.
 */
function RunResult({ result }: { result: CollectionRemindersRun }) {
  const { queued, dueSoon, overdue, skipped, overdueDeferred, withoutPhone } = result

  return (
    <div className="space-y-2 border-t pt-4">
      <p className="text-sm font-medium">
        {queued === 0
          ? 'No quedó nada nuevo en cola'
          : /* «Encolados» y no «enviados»: el worker despacha después. */
            `${plural(queued, 'mensaje encolado', 'mensajes encolados')}`}
      </p>

      {queued === 0 && (dueSoon > 0 || overdue > 0) && (
        /* El caso que se lee como fallo y no lo es: ya se había avisado hoy. */
        <p className="text-muted-foreground text-xs">
          Lo que tocaba avisar ya estaba dicho. Volver a pulsar no manda el mismo aviso dos veces.
        </p>
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
        <Row label="Por vencer" value={dueSoon} />
        <Row label="Vencidos" value={overdue} />
        <Row label="En cola" value={queued} />
        <Row label="Sin teléfono" value={withoutPhone} hint="No se les puede escribir." />
        <Row
          label="Aplazados"
          value={overdueDeferred}
          hint="Cayeron en horas de silencio; salen al terminar."
        />
        <Row label="Saltados" value={skipped} hint="Consentimiento, plantilla o cupo." />
      </dl>

      {queued > 0 && (
        <p className="text-muted-foreground text-xs">
          Están en cola: el envío lo hace el worker en segundos.{' '}
          <Link to="/cartera/cobranza" className="text-brand underline">
            Ver el historial
          </Link>
        </p>
      )}
    </div>
  )
}

function Row({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b py-1">
      <dt className="text-muted-foreground min-w-0">
        {label}
        {/* La explicación va pegada a su cifra: un cero suelto parece una avería. */}
        {hint && value > 0 && <span className="block text-[0.7rem] leading-tight">{hint}</span>}
      </dt>
      <dd className="nums shrink-0 font-medium">{value}</dd>
    </div>
  )
}
