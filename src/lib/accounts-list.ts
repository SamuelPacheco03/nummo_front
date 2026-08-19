import type { ListResult } from '@/lib/list-result'

/**
 * El vocabulario de **listar cartera** —cuentas por cobrar y por pagar—, sin
 * React.
 *
 * Es el tercer par espejo de la app, y el último que tuvo su componente común:
 * pagos/egresos ya compartían `SettlementList` y acuerdos/recurrentes
 * `RecurringList`, mientras estas dos seguían siendo dos archivos de quinientas
 * líneas idénticos en un 64%. Lo que cambia entre ellas son las palabras, el
 * endpoint y **una cosa de verdad** (§94.0): cobrar puede causar mora, y a un
 * proveedor no se le cobran intereses.
 */

/** Criterios que viajan en la URL. En español, como las rutas (§87.5). */
export const ACCOUNTS_FILTER_KEYS = [
  'estado',
  'contacto',
  'catalogo',
  'desde',
  'hasta',
  'orden',
  'dir',
  'pagina',
] as const
export type AccountsFilterKey = (typeof ACCOUNTS_FILTER_KEYS)[number]

/** Los que cuentan para el contador del botón «Filtros». */
export const ACCOUNTS_ADVANCED_KEYS: AccountsFilterKey[] = ['contacto', 'catalogo', 'desde', 'hasta']

/** Todos los estados del contrato, para el desplegable de los avanzados. */
export const ACCOUNT_STATUSES = [
  'PENDING',
  'PARTIAL',
  'OVERDUE',
  'PAID',
  'CANCELLED',
  'WRITTEN_OFF',
] as const

/** Lo primero que se quiere ver de una cartera: lo que vence antes. */
export const ACCOUNTS_DEFAULT_SORT = 'dueDate'

/** Lo que la pantalla pide; cada lado lo traduce a los nombres de su endpoint. */
export interface AccountsQuery {
  page: number
  pageSize: number
  q?: string
  sort: string
  order: 'asc' | 'desc'
  status?: string
  /** Pagador o proveedor, según el lado. */
  contactId?: string
  /** Concepto de cobro o categoría de gasto. */
  catalogId?: string
  dueAfter?: string
  dueBefore?: string
}

/** Una fila, ya normalizada: lo único que la lista necesita saber. */
export interface AccountRow {
  id: string
  /** Nombre de la contraparte, tal como lo manda el API. */
  contactName: string
  /** Concepto de cobro o categoría de gasto. */
  catalogId: string
  /** ISO. */
  dueDate: string
  balance: string
  currency: string
  displayStatus: string
}

export type AccountsListResult = ListResult<AccountRow>

/** El resumen de cartera, con lo que el contrato firma de cada lado. */
export interface AccountsSummary {
  totalOutstanding?: string
  overdueAmount?: string
  overdueCount?: number
  /**
   * Solo cobrar: `PayablesSummary` no los trae. Suman las **cuentas abiertas**
   * de la cabecera, y por eso ese subtítulo se calla en cuentas por pagar (§70:
   * un dato que no se tiene no se inventa).
   *
   * Los números de las fichas de estado **no** salen de aquí: los cuenta el
   * propio listado, que sabe hacerlo en los dos lados (§21.2).
   */
  pendingCount?: number
  partialCount?: number
}

/** Lo único que de verdad cambia entre las dos caras: las palabras. */
export interface AccountsListCopy {
  /** «Cuentas por cobrar» / «Cuentas por pagar». */
  title: string
  description: string
  /** «Por cobrar» / «Por pagar», para la cifra de cabecera. */
  kpiLabel: string
  /** «Buscar por pagador…» / «Buscar por proveedor…». */
  searchPlaceholder: string
  /** «Pagador» / «Proveedor». */
  contact: string
  /** «Concepto» / «Categoría», en singular, para la columna. */
  catalog: string
  /** «Concepto de cobro» / «Categoría de gasto», para el filtro. */
  catalogFilter: string
  /** «Todos los conceptos» / «Todas las categorías». */
  catalogAll: string
  /** «Sin concepto» / «Sin categoría». */
  catalogNone: string
  /** Cómo se llama una fila: `['cuenta', 'cuentas']`. */
  unit: [singular: string, plural: string]
  /** «cuentas por cobrar» / «cuentas por pagar», para el «sin resultados». */
  entity: string
  /** «Nueva cuenta» / «Nuevo gasto». */
  createLabel: string
  emptyTitle: string
  emptyDescription: string
  /** Qué hace «Generar mensualidades» en este lado. */
  generateHint: string
  /** Nombre del CSV, sin la fecha. */
  csvFile: string
  errorFallback: string
}
