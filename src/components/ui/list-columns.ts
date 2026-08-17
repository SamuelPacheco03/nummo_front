import { createColumnHelper, tableFeatures, rowSortingFeature, type RowData } from '@tanstack/react-table'

/**
 * Solo `rowSortingFeature`: en modo manual el orden lo hace el API, así que no
 * registramos `sortedRowModel` — se ignoraría. La feature está por el estado de
 * orden y por `column.getCanSort()`, que es lo que dibuja el control.
 */
export const listFeatures = tableFeatures({ rowSortingFeature })

export type ListFeatures = typeof listFeatures

/** Helper tipado para declarar columnas desde cada lista. */
export function listColumns<TData extends RowData>() {
  return createColumnHelper<ListFeatures, TData>()
}

/**
 * Pistas de presentación que viajan con la columna. Son lo que permite que un
 * único modelo de columnas dibuje la rejilla de escritorio y el apilado de
 * móvil sin duplicar la definición en dos sitios.
 */
interface ListColumnMeta {
  /** Etiqueta en el apilado de móvil. Por defecto, la cabecera si es texto. */
  label?: string
  /** Alineación del valor. Los importes van a la derecha. */
  align?: 'right'
  /** Fuera del apilado de móvil: chevrons y adornos que ahí no aportan. */
  hideOnStack?: boolean
}

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TFeatures, TData, TValue> extends ListColumnMeta {}
}
