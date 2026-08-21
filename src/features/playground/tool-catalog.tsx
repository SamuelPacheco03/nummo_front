import { Wrench } from 'lucide-react'
import { DataList, RowChevron } from '@/components/ui/data-list'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { listColumns } from '@/components/ui/list-columns'
import type { PlaygroundTool } from '@/api/generated/model'
import { toolOfferStatus } from './labels'

/**
 * **El catálogo de herramientas de una corrida**: las que el modelo va a ver y las que no,
 * con el motivo de cada ausencia.
 *
 * Es una **tabla y no un acordeón**, y el cambio importa: enseñar el porqué es la mitad
 * del valor del panel —«no aparece porque el rol no puede» y «no aparece porque estás en
 * solo lectura» son dos bugs distintos— y estaba escondido dentro de cada fila plegada. Un
 * catálogo de veinticuatro líneas iguales obligaba a abrirlas una por una para encontrar
 * las seis que faltan.
 *
 * El esquema y el ejecutor viven en el cajón de cada fila: es lo que se mira **después**
 * de haber encontrado la herramienta, no mientras se busca.
 */
export function ToolCatalog({
  tools,
  isPending,
  isError,
  error,
  onSelect,
}: {
  tools: PlaygroundTool[]
  isPending: boolean
  isError: boolean
  error: unknown
  /**
   * Abrir la ficha de una herramienta: qué es, por qué se ofrece o no, su esquema y —si se
   * puede— correrla.
   *
   * La fila no lleva su propio botón de ejecutar: llevarlo obligaba a repetir en la tabla
   * el motivo por el que no se puede («cambia el modo», «el rol no tiene el permiso»), que
   * es justo lo que ya dice la columna de al lado y lo que explica la ficha al abrirla.
   */
  onSelect?: (tool: PlaygroundTool) => void
}) {
  if (isError) {
    return <ErrorState error={error} fallback="No se pudo cargar el catálogo de herramientas." />
  }

  const column = listColumns<PlaygroundTool>()
  const columns = column.columns([
    column.display({
      id: 'name',
      header: 'Herramienta',
      meta: { card: 'title' },
      cell: ({ row }) => (
        <span className="min-w-0">
          <span className="block truncate font-mono text-xs font-medium">{row.original.name}</span>
          <span className="text-muted-foreground line-clamp-1 text-xs">
            {row.original.description}
          </span>
        </span>
      ),
    }),
    column.display({
      id: 'kind',
      header: 'Tipo',
      meta: { label: 'Tipo' },
      cell: ({ row }) =>
        row.original.kind === 'write' ? (
          <StatusBadge tone="warning" label="Escribe" />
        ) : (
          <span className="text-muted-foreground">Lee</span>
        ),
    }),
    column.display({
      id: 'permission',
      header: 'Permiso',
      meta: { hideOnStack: true },
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {row.original.permission ?? '—'}
        </span>
      ),
    }),
    column.display({
      id: 'offered',
      header: 'Estado',
      meta: { card: 'status' },
      cell: ({ row }) => (
        <StatusBadge {...toolOfferStatus(row.original.offered, row.original.withheld)} />
      ),
    }),
    ...(onSelect
      ? [
          column.display({
            id: 'chevron',
            header: '',
            meta: { hideOnStack: true as const },
            cell: () => <RowChevron />,
          }),
        ]
      : []),
  ])

  const offered = tools.filter((tool) => tool.offered).length

  return (
    <div className="space-y-3">
      {!isPending && tools.length > 0 && (
        <p className="text-muted-foreground text-sm">
          <span className="nums text-foreground font-medium">{offered}</span> de{' '}
          <span className="nums">{tools.length}</span> se le ofrecen al modelo en esta corrida.
          {/* «El estado» y no «la columna Estado»: en móvil son tarjetas, no columnas. */}{' '}
          El estado de cada una dice por qué no las demás.
        </p>
      )}

      <DataList
        columns={columns}
        rows={tools}
        getRowId={(tool) => tool.name}
        onRowClick={onSelect}
        isLoading={isPending}
        skeletonRows={8}
        emptyText={
          <EmptyState
            Icon={Wrench}
            title="Sin herramientas"
            description="Este rol no ve ninguna herramienta en este modo."
          />
        }
      />
    </div>
  )
}
