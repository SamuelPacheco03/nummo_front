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

/** Estados que devuelve el contrato para un pago o un egreso. */
export const SETTLEMENT_STATUSES = ['POSTED', 'REVERSED'] as const

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
  /** ISO. Recibido o desembolsado, según el lado. */
  date: string
  amount: string
  status: string
  purpose: string
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
