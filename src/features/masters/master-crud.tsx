import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Pencil, Plus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import { Button } from '@/components/ui/button'
import { DataList } from '@/components/ui/data-list'
import { EmptyState, NoResults } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import {
  FilterField,
  FilterSheet,
  FilterSortField,
  type SortChoice,
} from '@/components/ui/filter-sheet'
import { listColumns, type CardRole } from '@/components/ui/list-columns'
import { ListToolbar } from '@/components/ui/list-toolbar'
import { NativeSelect } from '@/components/ui/native-select'
import { StatusDot } from '@/components/ui/status-badge'
import { plural } from '@/lib/format'
import type { ListResult } from '@/lib/list-result'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { useListFilters } from '@/lib/use-list-filters'
import type { MasterParams } from './hooks'

/** Diez, como el resto de listados. */
const PAGE_SIZE = 10

/** Criterios que viven en la URL, en español como las rutas (§87.5). */
const FILTER_KEYS = ['estado', 'orden', 'dir', 'pagina'] as const
type FilterKey = (typeof FILTER_KEYS)[number]

/**
 * Qué se ve. El vacío es «solo activos», que es lo que se quiere casi siempre:
 * desactivar un maestro existe para quitarlo de los formularios sin borrarlo.
 */
const VISIBILITY = [
  { value: '', label: 'Activos', isActive: 'true' as const },
  { value: 'inactivos', label: 'Inactivos', isActive: 'false' as const },
  { value: 'todos', label: 'Todos', isActive: undefined },
]

/** Los maestros solo ordenan por estas dos, según el contrato (NamedListQuery). */
const SORT_CHOICES: SortChoice[] = [
  { field: 'name', label: 'Nombre', asc: 'De la A a la Z', desc: 'De la Z a la A' },
  { field: 'createdAt', label: 'Creación', asc: 'Más antiguos', desc: 'Más recientes' },
]

const DEFAULT_SORT = 'name'

/** Una columna del maestro: cabecera y cómo se pinta la celda. */
export interface Column<T> {
  header: string
  cell: (row: T) => ReactNode
  className?: string
  headClassName?: string
  /**
   * Qué papel tiene en la tarjeta de móvil.
   *
   * Lo dice el maestro y no se adivina por posición: la primera columna de un
   * catálogo suele ser el código, que casi siempre está vacío, y un título «—»
   * con el nombre debajo no es una tarjeta, es un error de lectura.
   *
   * **A `meta` solo columnas que siempre tienen valor.** Lo que puede venir
   * vacío se deja sin papel y cae al pie de la tarjeta, donde un «—» no rompe
   * ninguna frase.
   */
  card?: CardRole
  /**
   * Fuera de la tarjeta de móvil.
   *
   * Para lo que casi siempre viene vacío —el código, la descripción—: en la
   * tabla un «—» mantiene la rejilla, pero apilar tres «—» bajo cada tarjeta es
   * ruido con forma de dato.
   */
  hideOnCard?: boolean
}

/**
 * **Listado CRUD de un maestro**: conceptos de cobro, categorías de gasto,
 * métodos de pago, cuentas financieras, políticas de interés.
 *
 * Fue el último en entrar al patrón de §21.1 y estuvo un tiempo declarado como
 * excepción —«un catálogo corto que no se comparte por enlace»—. La excepción no
 * se sostuvo: los criterios se perdían al volver de editar, y mantener aquí una
 * barra de filtros propia significaba arreglar dos veces cada cosa que se
 * arreglaba en las otras listas.
 *
 * Ahora comparte `ListToolbar`, `FilterSheet` y `useListFilters` con el resto, y
 * `useList` es un hook como en `SettlementList`: los filtros viven aquí y la
 * consulta en la feature que conoce su endpoint.
 *
 * **Sin cifras de cabecera:** un catálogo no tiene nada que resumir.
 */
export function MasterCrud<T extends { id: string; isActive: boolean }>({
  title,
  description,
  storageKey,
  canManage,
  Icon,
  newLabel = 'Nuevo',
  searchPlaceholder = 'Buscar…',
  entity,
  columns,
  onNew,
  onEdit,
  useList,
}: {
  title: string
  description: string
  /** Clave de `sessionStorage` para recordar los filtros de la sesión. */
  storageKey: string
  canManage: boolean
  /**
   * Icono de la fila en la tarjeta de móvil.
   *
   * Uno por maestro mientras cada registro no traiga el suyo. Cuando conceptos
   * de cobro y categorías de gasto tengan icono propio, esto pasa a leerse de la
   * fila y la tarjeta no cambia.
   */
  Icon?: LucideIcon
  newLabel?: string
  searchPlaceholder?: string
  /** Cómo se cuenta: `['concepto', 'conceptos']`. */
  entity: [singular: string, plural: string]
  /** **Debe ser estable**: constante de módulo o `useMemo` (ver más abajo). */
  columns: Column<T>[]
  onNew: () => void
  onEdit: (row: T) => void
  useList: (params: MasterParams) => ListResult<T>
}) {
  const { values, set, clear } = useListFilters<FilterKey>(storageKey, FILTER_KEYS)
  const [search, setSearch] = useState('')
  const q = useDebouncedValue(search.trim(), 300)
  const [sheetOpen, setSheetOpen] = useState(false)

  const page = Number(values.pagina) || 1
  const sortField = values.orden || DEFAULT_SORT
  const desc = values.dir === 'desc'

  /** Cambiar cualquier criterio devuelve a la primera página. */
  const filter = (patch: Partial<Record<FilterKey, string>>) => set({ ...patch, pagina: '' })

  /** El orden por defecto se calla en la URL: solo estorba al compartirla. */
  const sortBy = (field: string, descending: boolean) =>
    filter({ orden: field === DEFAULT_SORT ? '' : field, dir: descending ? 'desc' : '' })

  const visibility = VISIBILITY.find((v) => v.value === values.estado) ?? VISIBILITY[0]

  const { items, total, totalPages, isPending, isError, error, isFetching } = useList({
    page,
    pageSize: PAGE_SIZE,
    q: q || undefined,
    isActive: visibility.isActive,
    sort: sortField as MasterParams['sort'],
    order: desc ? 'desc' : 'asc',
  })

  /*
    `onEdit` se recrea en cada render del padre. Guardarlo en una ref permite
    memorizar las columnas por su identidad —lo correcto— sin quedarse con una
    versión vieja del callback.

    Antes se memorizaba por `columns.length`, y eso escondía un fallo real: una
    celda que cerrara sobre datos que llegan del API (el nombre de la sede en
    cuentas financieras) se quedaba congelada en su primer valor, porque el
    número de columnas nunca cambia.
  */
  const onEditRef = useRef(onEdit)
  onEditRef.current = onEdit

  const column = useMemo(() => listColumns<T>(), [])
  const allColumns = useMemo(
    () =>
      column.columns([
        ...columns.map((c, i) =>
          column.display({
            id: `col-${i}`,
            header: c.header,
            meta: { card: c.card, hideOnStack: c.hideOnCard },
            cell: ({ row }) =>
              i === 0 ? (
                <span className="font-medium">{c.cell(row.original)}</span>
              ) : (
                c.cell(row.original)
              ),
          }),
        ),
        column.display({
          id: 'status',
          header: 'Estado',
          meta: { card: 'status' },
          cell: ({ row }) => <StatusDot active={row.original.isActive} />,
        }),
        ...(canManage
          ? [
              column.display({
                id: 'edit',
                header: '',
                meta: { hideOnStack: true },
                cell: ({ row }) => (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => onEditRef.current(row.original)}
                    aria-label="Editar"
                  >
                    <Pencil className="size-4" />
                  </Button>
                ),
              }),
            ]
          : []),
      ]),
    [column, columns, canManage],
  )

  const hasFilters = Boolean(q) || FILTER_KEYS.some((k) => k !== 'pagina' && values[k])
  const clearAll = () => {
    setSearch('')
    clear()
  }

  /* En la cabecera el título ya ocupa la fila en móvil, así que la acción se
     reduce a su icono; en el vacío hay sitio de sobra y va con su texto. */
  const newButton = (compact: boolean) => (
    <Button size="sm" onClick={onNew} aria-label={newLabel}>
      <Plus aria-hidden className="size-4" />
      <span className={compact ? 'hidden sm:inline' : undefined}>{newLabel}</span>
    </Button>
  )

  return (
    <div className="space-y-5">
      <PageHeader title={title} description={description}>
        {canManage && newButton(true)}
      </PageHeader>

      {isError ? (
        <ErrorState error={error} fallback="No se pudo cargar la información." />
      ) : (
        <>
          <ListToolbar
            search={search}
            onSearch={setSearch}
            searchPlaceholder={searchPlaceholder}
            main={{
              label: 'Estado',
              // El vacío aquí no es «todos», es «solo activos»: `ListToolbar`
              // pinta esta etiqueta en la opción sin valor.
              allLabel: 'Activos',
              choices: VISIBILITY.map(({ value, label }) => ({ value, label })),
              value: values.estado,
              onChange: (estado) => filter({ estado }),
            }}
            // El estado se ve siempre: no hay filtro escondido que avisar.
            filterCount={0}
            onOpenFilters={() => setSheetOpen(true)}
          />

          <DataList
            columns={allColumns}
            rows={items}
            getRowId={(row) => row.id}
            rowIcon={Icon ? () => ({ Icon }) : undefined}
            sort={{
              value: [{ id: sortField, desc }],
              onChange: (next) => sortBy(next[0]?.id ?? DEFAULT_SORT, Boolean(next[0]?.desc)),
              options: SORT_CHOICES.map(({ field, label }) => ({ field, label })),
              // El orden ya vive en el cajón, que es la única vía en móvil.
              showSortControl: false,
            }}
            isLoading={isPending}
            skeletonRows={PAGE_SIZE}
            emptyText={
              hasFilters ? (
                <NoResults entity={entity[1]} onClear={clearAll} />
              ) : (
                <EmptyState
                  title={`Todavía no tienes ${entity[1]}`}
                  description={description}
                  action={canManage && newButton(false)}
                />
              )
            }
          />

          {!isPending && total > 0 && (
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              totalPages={totalPages}
              isFetching={isFetching}
              onPage={(next) => set({ pagina: next > 1 ? String(next) : '' })}
            />
          )}
        </>
      )}

      <FilterSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onClear={clearAll}
        canClear={hasFilters}
        resultLabel={`Ver ${plural(total, entity[0], entity[1])}`}
      >
        <FilterField label="Estado" hint="Desactivar uno lo saca de los formularios, no lo borra.">
          <NativeSelect
            value={values.estado}
            onChange={(e) => filter({ estado: e.target.value })}
            aria-label="Estado"
          >
            {VISIBILITY.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </FilterField>

        <FilterSortField choices={SORT_CHOICES} field={sortField} desc={desc} onChange={sortBy} />
      </FilterSheet>
    </div>
  )
}
