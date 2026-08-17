import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  isFetching,
  onPage,
}: {
  page: number
  pageSize: number
  total: number
  totalPages: number
  isFetching?: boolean
  onPage: (page: number) => void
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  /*
    La paginación pertenece a la lista que hay encima, no es otro bloque de la
    página: separada como uno más quedaba flotando en medio de la nada.

    De ahí las dos piezas del espacio. `pt-1.5` es lo suyo —la mitad de lo que
    tenía—; el `-mt-2` recorta el hueco que le pone el `space-y-*` del contenedor,
    que se aplica como `margin-bottom` de la lista y no se puede tocar desde aquí
    de otra forma. Ocho puntos y no más: en un panel de `space-y-3` tiene que
    seguir quedando aire.
  */
  return (
    <div className="text-muted-foreground -mt-2 flex items-center justify-between gap-3 pt-1.5 text-sm">
      <span className="nums">
        {from}–{to} de {total}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          disabled={page <= 1 || isFetching}
          onClick={() => onPage(page - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="nums px-2 text-foreground">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          disabled={page >= totalPages || isFetching}
          onClick={() => onPage(page + 1)}
          aria-label="Página siguiente"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
