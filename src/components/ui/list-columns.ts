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
 * Papel de una columna **dentro de la tarjeta de móvil**.
 *
 * En escritorio todas las columnas valen lo mismo: son columnas. En una tarjeta
 * de 360 px no —hay un nombre, un par de datos de contexto, un estado y una
 * cifra—, y sin decir cuál es cuál se acaba pintando seis filas etiqueta-valor
 * del mismo tamaño donde el nombre del proveedor pesa igual que la referencia.
 *
 * Una columna sin papel **no desaparece**: cae al bloque secundario, al pie de la
 * tarjeta. Por eso una lista que no declare ninguno se sigue viendo como siempre.
 */
export type CardRole =
  /** El nombre. Es lo que convierte el apilado en tarjeta: sin él no hay tarjeta. */
  | 'title'
  /** Contexto bajo el título, unido por `·`: categoría, fecha, tipo. */
  | 'meta'
  /** La insignia de estado, sola a la izquierda del pie. */
  | 'status'
  /** La cifra protagonista, a la derecha. */
  | 'amount'
  /** La cifra pequeña bajo la protagonista: casi siempre el saldo. */
  | 'sub'

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
  /** Fuera de la tarjeta de móvil: chevrons y adornos que ahí no aportan. */
  hideOnStack?: boolean
  /**
   * Fuera de la tabla de escritorio.
   *
   * El simétrico de `hideOnStack`, y hace falta por lo mismo: la tarjeta y la
   * tabla son dos presentaciones del mismo dato, y cada una puede necesitar algo
   * que a la otra le sobra. La categoría de un gasto es contexto en la línea de
   * la tarjeta, pero en escritorio ya va bajo el nombre del proveedor; repetirla
   * en su propia columna sería decir lo mismo dos veces.
   */
  hideOnTable?: boolean
  /** Qué es esta columna en la tarjeta de móvil. */
  card?: CardRole
  /**
   * Cómo llama el endpoint al campo que ordena esta columna.
   *
   * Por defecto es el `id` de la columna, que es lo que hace que «Vence»
   * (`dueDate`) o «Monto» (`amount`) se ordenen sin declarar nada. Pero el `id`
   * es vocabulario de la interfaz y el campo es vocabulario del contrato, y no
   * siempre coinciden: en las pantallas espejo la **misma** columna se llama
   * distinto a cada lado —la fecha de un pago es `receivedAt` y la de un egreso
   * `disbursedAt`—, así que el `id` no puede ser ninguno de los dos.
   *
   * Cuando no coinciden hay que decirlo aquí. Callarlo no rompe nada de forma
   * visible: la cabecera simplemente deja de ordenar, que es exactamente el
   * fallo que tuvieron pagos y egresos —«Monto» ordenaba y «Fecha» no, en una
   * tabla donde las dos podían—.
   */
  sortField?: string
}

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TFeatures, TData, TValue> extends ListColumnMeta {}
}
