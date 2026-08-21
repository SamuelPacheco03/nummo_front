import type { ReactNode } from 'react'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { Wrench } from 'lucide-react'
import type { PlaygroundTool } from '@/api/generated/model'
import { Disclosure, JsonBlock } from './code-block'
import { toolOfferStatus } from './labels'

/**
 * **El catálogo de herramientas de una corrida**: las que el modelo va a ver y las que
 * no, con el motivo de cada ausencia.
 *
 * Enseñar el porqué es la mitad del valor del panel: «no aparece porque el rol no puede»
 * y «no aparece porque estás en solo lectura» son dos bugs distintos, y sin distinguirlos
 * los dos se investigan igual.
 *
 * Lo comparten la consola —que lo abre en un cajón para revisar antes de preguntar— y el
 * ejecutor, que además corre cada herramienta a mano.
 */
export function ToolCatalog({
  tools,
  isPending,
  isError,
  error,
  action,
}: {
  tools: PlaygroundTool[]
  isPending: boolean
  isError: boolean
  error: unknown
  /** Lo que cada herramienta ofrece hacer. El ejecutor pone aquí su botón. */
  action?: (tool: PlaygroundTool) => ReactNode
}) {
  if (isError) {
    return <ErrorState error={error} fallback="No se pudo cargar el catálogo de herramientas." />
  }

  if (isPending) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    )
  }

  if (tools.length === 0) {
    return (
      <EmptyState
        Icon={Wrench}
        title="Sin herramientas"
        description="Este rol no ve ninguna herramienta en este modo."
      />
    )
  }

  const offered = tools.filter((tool) => tool.offered).length

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">
        <span className="nums text-foreground font-medium">{offered}</span> de{' '}
        <span className="nums">{tools.length}</span> se le ofrecen al modelo en esta corrida.
      </p>

      <div className="space-y-2">
        {tools.map((tool) => (
          <Disclosure
            key={tool.name}
            summary={
              <span className="flex flex-wrap items-center gap-2">
                <span className="truncate font-medium">{tool.name}</span>
                <StatusBadge {...toolOfferStatus(tool.offered, tool.withheld)} />
                {tool.kind === 'write' && <StatusBadge tone="warning" label="Escribe" />}
              </span>
            }
          >
            <p className="text-muted-foreground text-sm leading-relaxed">{tool.description}</p>
            {tool.permission && (
              <p className="text-muted-foreground text-xs">
                Permiso: <span className="text-foreground">{tool.permission}</span>
              </p>
            )}

            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-medium">Argumentos que acepta</p>
              {tool.schema == null ? (
                /*
                  Un esquema que no se pudo representar no es un error: la herramienta
                  existe y se ofrece igual. Lo que no hay es formulario.
                */
                <p className="text-muted-foreground text-xs">
                  Su esquema no se pudo representar. La herramienta funciona igual.
                </p>
              ) : (
                <JsonBlock value={tool.schema} />
              )}
            </div>

            {action?.(tool)}
          </Disclosure>
        ))}
      </div>
    </div>
  )
}
