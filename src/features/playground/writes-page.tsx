import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { PenLine } from 'lucide-react'
import { Panel } from '@/components/panel'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Note } from '@/components/ui/note'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateHuman } from '@/lib/format'
import { JsonBlock } from './code-block'
import { usePlaygroundWrites } from './hooks'
import { TraceDrawer } from './trace-drawer'

/**
 * **Qué dejó escrito una corrida.**
 *
 * **No hay reversa masiva y no la va a haber**: deshacer movimientos financieros en bloque
 * es una operación de dinero, y las reversas ya existen una a una con su auditoría (§55).
 * Esta pantalla dice **qué revisar**; deshacerlo se hace por la puerta de siempre, desde la
 * organización.
 */
export function PlaygroundWritesPage() {
  const [params, setParams] = useSearchParams()
  const fromUrl = params.get('conversacion') ?? ''
  const [draft, setDraft] = useState(fromUrl)
  const [openTrace, setOpenTrace] = useState<string | null>(null)

  const { writes, isPending, isError, error } = usePlaygroundWrites(fromUrl)

  const search = () =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (draft.trim()) next.set('conversacion', draft.trim())
        else next.delete('conversacion')
        return next
      },
      { replace: true },
    )

  return (
    <div className="space-y-5">
      <PageHeader
        title="Escrituras de una corrida"
        description="Lo que Numi registró de verdad en una conversación: pagos, egresos, contactos."
      />

      <Panel title="Qué conversación">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            search()
          }}
        >
          <div className="min-w-56 flex-1">
            <Field
              label="Identificador de la conversación"
              htmlFor="pg-conversacion"
              hint="Llega desde el panel de respuestas puntuadas, o se pega a mano."
            >
              <Input
                id="pg-conversacion"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="0d5f…"
                className="font-mono text-xs"
              />
            </Field>
          </div>
          <Button type="submit">Buscar</Button>
        </form>
      </Panel>

      {!fromUrl ? (
        <EmptyState
          Icon={PenLine}
          title="Elige una conversación"
          description="Aquí se enseña lo que esa corrida dejó escrito en la contabilidad del cliente."
        />
      ) : isError ? (
        <ErrorState error={error} fallback="No se pudieron cargar las escrituras." />
      ) : isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : writes.length === 0 ? (
        <EmptyState
          Icon={PenLine}
          title="Esta corrida no escribió nada"
          description="Ninguna herramienta de escritura llegó a ejecutarse en esa conversación."
        />
      ) : (
        <>
          <Note title="La reversa no se hace desde aquí">
            Deshacer movimientos de dinero en bloque no existe y no va a existir: cada
            reversa es una operación con su auditoría y se hace desde la organización, una
            a una. Esta lista dice qué revisar.
          </Note>

          <div className="space-y-3">
            {writes.map((write, index) => (
              <article key={`${write.traceId}-${index}`} className="space-y-2 rounded-lg border p-4">
                <header className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-mono text-sm font-medium">{write.tool}</h3>
                  <span className="text-muted-foreground text-xs">{formatDateHuman(write.at)}</span>
                </header>
                <JsonBlock value={write.result} />
                <button
                  type="button"
                  onClick={() => setOpenTrace(write.traceId)}
                  className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 rounded text-xs underline-offset-4 transition-colors hover:underline focus-visible:ring-[3px] focus-visible:outline-none"
                >
                  Ver la traza del turno
                </button>
              </article>
            ))}
          </div>
        </>
      )}

      {openTrace && <TraceDrawer traceId={openTrace} onClose={() => setOpenTrace(null)} />}
    </div>
  )
}
