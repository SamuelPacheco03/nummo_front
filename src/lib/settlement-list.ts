import type { ListResult } from '@/lib/list-result'

/**
 * El vocabulario de **listar dinero registrado** —pagos y egresos—, sin React.
 *
 * Pagos y egresos son la misma pantalla vista desde los dos lados, igual que
 * cuentas por cobrar y por pagar (§94.0). Lo que cambia entre ellas es el nombre
 * del contacto, el del campo de fecha y tres propósitos; nada de eso justifica
 * dos pantallas.
 */

/** Criterios que viajan en la URL. En español, como las rutas (§87.5). */
export const SETTLEMENT_FILTER_KEYS = [
  'contacto',
  'estado',
  'proposito',
  'orden',
  'dir',
  'pagina',
] as const
export type SettlementFilterKey = (typeof SETTLEMENT_FILTER_KEYS)[number]

/** Los que cuentan para el contador del botón «Filtros». */
export const SETTLEMENT_ADVANCED_KEYS: SettlementFilterKey[] = ['contacto', 'proposito']

/**
 * Estados de cada cara. **Ya no son los mismos**, y esta es la primera
 * diferencia real entre pagos y egresos desde que comparten pantalla: con las
 * aprobaciones por umbral, un egreso puede quedar esperando firma o ser
 * rechazado; un pago que entra no lo aprueba nadie.
 *
 * Viaja como prop, igual que las palabras y el endpoint (§94.0): una lista
 * común con los cuatro ofrecería a pagos dos filtros que su API rechaza.
 */
export const PAYMENT_STATUSES = ['POSTED', 'REVERSED'] as const
export const DISBURSEMENT_STATUSES = ['PENDING_APPROVAL', 'POSTED', 'REJECTED', 'REVERSED'] as const

/**
 * Los que **no movieron dinero y ya no lo van a mover**: van tachados, como
 * siempre estuvo el reversado. Un pendiente no entra aquí — todavía puede salir,
 * y tacharlo lo leería como cancelado.
 */
const VOIDED_STATUSES: readonly string[] = ['REVERSED', 'REJECTED']

export function isVoidedSettlement(status: string): boolean {
  return VOIDED_STATUSES.includes(status)
}

/** Lo que la pantalla pide; cada lado lo traduce a los nombres de su endpoint. */
export interface SettlementQuery {
  page: number
  pageSize: number
  q?: string
  /** Columna del contrato: `receivedAt` en pagos, `disbursedAt` en egresos. */
  sort: string
  order: 'asc' | 'desc'
  contactId?: string
  status?: string
  purpose?: string
}

/** Una fila, ya normalizada: lo único que la lista necesita saber. */
export interface SettlementRow {
  id: string
  contactId?: string | null
  /** Nombre de la contraparte, tal como lo manda el API. */
  contactName: string
  /** ISO. Recibido o desembolsado, según el lado. */
  date: string
  amount: string
  status: string
  purpose: string
  /**
   * Concepto de cobro o categoría de gasto, **solo cuando el movimiento va
   * directo a uno**: un ingreso o un gasto directo lo trae en el contrato
   * (`directBillingConceptId` / `directExpenseCategoryId`).
   *
   * Un pago aplicado a cartera no tiene uno: puede saldar varias cuentas de
   * conceptos distintos, y el listado no dice cuáles. Un abono a cuenta no
   * pertenece a ninguno todavía. En esos dos casos la fila se queda con el
   * icono de la sección, que es lo honesto (§70).
   */
  catalogId?: string | null
}

export type SettlementListResult = ListResult<SettlementRow>

/** Lo único que de verdad cambia entre pagos y egresos: las palabras. */
export interface SettlementListCopy {
  /** «Pagos» / «Egresos». */
  title: string
  description: string
  /** «Registrar pago» / «Registrar egreso». */
  action: string
  /** «Pagador» / «Proveedor». */
  party: string
  /** Marcador del buscador. */
  searchPlaceholder: string
  /** Cómo se llaman en un vacío: «pagos» / «egresos». */
  entity: string
  emptyTitle: string
  emptyDescription: string
  loadError: string
}
