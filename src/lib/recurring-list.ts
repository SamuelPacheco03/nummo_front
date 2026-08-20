import type { ListResult } from '@/lib/list-result'

/**
 * El vocabulario de **listar lo que se repite todos los meses** —acuerdos de
 * cobro y gastos recurrentes—, sin React.
 *
 * Son el tercer par espejo de la app (§94.0): una plantilla que genera sola la
 * cuenta de cada período, mirada desde el lado que cobra y desde el que paga.
 * Comparten columnas, ciclo de vida (activo, pausado, finalizado) y filtros;
 * cambian el nombre del contacto y el endpoint.
 */

/** Criterios que viven en la URL, en español como las rutas (§87.5). */
export const RECURRING_FILTER_KEYS = ['estado', 'contacto', 'orden', 'dir', 'pagina'] as const
export type RecurringFilterKey = (typeof RECURRING_FILTER_KEYS)[number]

/** Los que cuentan para el contador del botón «Filtros». */
export const RECURRING_ADVANCED_KEYS: RecurringFilterKey[] = ['contacto']

/** Todos los del contrato, para el desplegable. */
export const RECURRING_STATUSES = ['ACTIVE', 'PAUSED', 'ENDED', 'CANCELLED']

/**
 * Los del trabajo diario. Finalizado y cancelado son consulta ocasional —como
 * una cuenta ya pagada— y viven en el cajón: sacarlos de aquí es lo que deja las
 * fichas en una línea en vez de dejar una suelta abajo (§21).
 */
export const RECURRING_FREQUENT_STATUSES = [
  { value: 'ACTIVE', label: 'Activos' },
  { value: 'PAUSED', label: 'Pausados' },
]

/** Lo que la pantalla pide; cada lado lo traduce a los nombres de su endpoint. */
export interface RecurringQuery {
  page: number
  pageSize: number
  q?: string
  /** `name` o `createdAt`, según el contrato. */
  sort: string
  order: 'asc' | 'desc'
  contactId?: string
  status?: string
}

/** Una fila, ya normalizada: lo único que la lista necesita saber. */
export interface RecurringRow {
  id: string
  /** Quién paga o a quién se paga. */
  contactId: string
  /** El nombre propio de la plantilla, si se le puso uno. */
  name: string | null
  /**
   * Concepto de cobro o categoría de gasto. La lista lo cruza contra el catálogo
   * para la segunda línea —cuando no hay nombre propio— y para el icono de la
   * tarjeta: el contrato manda el id y nada más (§95.19).
   */
  catalogId: string
  recurrenceType: string
  dueDay: number
  status: string
  agreedAmount: string
  currency?: string
}

export type RecurringListResult = ListResult<RecurringRow>

/** Lo único que de verdad cambia entre cobrar y pagar cada mes: las palabras. */
export interface RecurringListCopy {
  /** «Acuerdos» / «Gastos recurrentes». */
  title: string
  description: string
  /** «Nuevo acuerdo» / «Nuevo recurrente». */
  action: string
  /** «Pagador» / «Proveedor». */
  party: string
  searchPlaceholder: string
  /** Cómo se cuentan: `['acuerdo', 'acuerdos']`. */
  entity: [singular: string, plural: string]
  emptyTitle: string
  emptyDescription: string
  loadError: string
}
