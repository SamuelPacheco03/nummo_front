import { useState } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Loader } from '@/components/ui/loader'
import { Note } from '@/components/ui/note'
import { Skeleton } from '@/components/ui/skeleton'
import { toastApiError } from '@/features/platform/errors'
import { useHydrateOnce } from '@/lib/use-hydrate-once'
import type { ListResult } from '@/lib/list-result'
import { CatalogIcon } from './catalog-icon'
import type { MasterParams } from './hooks'

/** Lo mínimo que necesita una fila para poder ordenarse y verse. */
export interface Orderable {
  id: string
  name: string
  icon?: string | null
  color?: string | null
  position: number
}

/**
 * Se piden todos de una vez: reordenar de a diez páginas no es reordenar. Es el
 * tope del contrato, y los catálogos reales son de diez a treinta.
 */
const ALL = 100

/**
 * **El orden propio de un catálogo**, el que se respeta en las listas y en los
 * selectores.
 *
 * Va en un cajón y no en la propia lista por una razón concreta: la lista pagina
 * de diez en diez, y con flechas por fila el primero de la página dos no tendría
 * a dónde subir. Aquí se cargan todos y el orden se ve entero mientras se toca.
 *
 * **Flechas y no arrastrar.** Arrastrar pide una dependencia (§63) y encima deja
 * fuera al teclado (§46); dos botones no hacen ninguna de las dos cosas.
 *
 * **Se guarda al final, y solo lo que se movió.** El contrato no tiene endpoint
 * de reordenamiento masivo —es un `PATCH` por elemento—, así que mandar los
 * treinta por mover uno serían veintinueve escrituras que no cambian nada.
 */
export function CatalogOrderDrawer<T extends Orderable>({
  open,
  onOpenChange,
  title,
  fallback,
  useList,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** El icono de la sección, para las filas que no tienen uno propio. */
  fallback: LucideIcon
  useList: (params: MasterParams) => ListResult<T>
  /** Guarda cada elemento movido con su posición nueva. */
  onSave: (moves: { id: string; position: number }[]) => Promise<void>
}) {
  const { items, total, isPending } = useList({
    page: 1,
    pageSize: ALL,
    // Todos, activos e inactivos: el orden es del catálogo, no de lo que se ve
    // hoy en los formularios.
    sort: 'position',
    order: 'asc',
  })

  const [rows, setRows] = useState<T[]>([])
  const [saving, setSaving] = useState(false)

  /*
    La clave lleva `open` porque el cajón no se desmonta al cerrarse: sin ella,
    abrirlo por segunda vez enseñaría el borrador de la primera. Y lleva `items`
    delante para que la clave aparezca **con** el dato y no antes (§45.7).
  */
  useHydrateOnce(items.length > 0 ? `${open}` : undefined, items, setRows)

  const move = (index: number, delta: number) =>
    setRows((current) => {
      const next = [...current]
      const target = index + delta
      if (target < 0 || target >= next.length) return current
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })

  const moves = rows
    .map((row, index) => ({ id: row.id, position: index }))
    .filter(({ position }, index) => rows[index].position !== position)

  const save = async () => {
    setSaving(true)
    try {
      await onSave(moves)
      toast.success('Orden guardado')
      onOpenChange(false)
    } catch (err) {
      toastApiError(err, 'No se pudo guardar el orden')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      meta="El orden en que aparecen en las listas y en los formularios."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => void save()} disabled={saving || moves.length === 0}>
            {saving && <Loader size="sm" />}
            Guardar orden
          </Button>
        </div>
      }
    >
      {isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          {total > rows.length && (
            <Note tone="info" title="Se ordenan los primeros 100">
              Este catálogo tiene {total}. Los demás conservan el orden que ya tenían.
            </Note>
          )}
          <ul className="divide-y">
            {rows.map((row, index) => (
              <li key={row.id} className="flex items-center gap-3 py-2">
                <CatalogIcon icon={row.icon} color={row.color} fallback={fallback} />
                <span className="min-w-0 flex-1 truncate text-sm">{row.name}</span>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    aria-label={`Subir ${row.name}`}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    disabled={index === rows.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label={`Bajar ${row.name}`}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Drawer>
  )
}
