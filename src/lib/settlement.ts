/**
 * El vocabulario de registrar dinero, sin nada de React.
 *
 * Vive aparte del componente porque lo usan los dos lados —cobros y pagos— para
 * preparar sus datos **antes** de montar el formulario, y porque una regla de
 * negocio como «qué cuenta admite dinero» se prueba mejor sin pantalla.
 */

/** Estados en los que una cuenta sigue admitiendo dinero. */
const OPEN_STATUSES = new Set(['PENDING', 'PARTIAL', 'OVERDUE'])

/**
 * Una cuenta cuenta como abierta si admite dinero: ni cerrada ni saldada.
 *
 * El saldo se mira además del estado porque el contrato permite una cuenta
 * `PARTIAL` con saldo cero mientras el backend no la cierra, y ofrecerla para
 * aplicarle un pago sería ofrecer un sitio donde el dinero no cabe.
 */
export function isOpenAccount(item: { displayStatus: string; balance: string }) {
  return OPEN_STATUSES.has(item.displayStatus) && Number(item.balance) > 0
}

/** Una cuenta abierta a la que se le puede aplicar el dinero. */
export interface OpenAccount {
  id: string
  dueDate: string
  balance: string
  currency?: string
}

/** Lo que el formulario entrega. Cada lado lo traduce a su endpoint. */
export interface SettlementValues {
  purpose: string
  paymentMethodId: string
  financialAccountId: string
  amount: string
  /** `yyyy-mm-dd`; el contrato pide ISO completo, lo compone quien envía. */
  date: string
  reference?: string
  directConceptId?: string
  allocations: { id: string; amount: string }[]
}

/** Lo único que de verdad cambia entre cobrar y pagar: las palabras. */
export interface SettlementCopy {
  /** «Registrar pago» / «Registrar egreso». Sirve de título y de botón. */
  action: string
  /** «Pagador» / «Proveedor». */
  party: string
  /** Qué falta si no se eligió: «Selecciona el pagador». */
  partyMissing: string
  /** «Cuenta destino» / «Cuenta origen». */
  account: string
  /** «Concepto del ingreso» / «Categoría del egreso». */
  directConcept: string
  directConceptMissing: string
  /** «Aplicar a cuentas por cobrar» / «Aplicar a gastos». */
  allocate: string
  /** Cómo se llama lo que está abierto: `['gasto abierto', 'gastos abiertos']`. */
  open: [singular: string, plural: string]
  /** «Cobrar todo» / «Pagar todo». */
  settleAll: string
  /** Qué pasa si este contacto no tiene nada abierto. */
  nothingOpen: string
  /** Qué pasa con lo que sobre del monto. */
  leftover: string
}

/**
 * Param que dice **a dónde volver** después de registrar el movimiento.
 *
 * Registrar un pago desde una cuenta por cobrar terminaba en la ficha del pago:
 * dos pantallas más allá de donde se estaba, y con la lista de cartera —lo que
 * se estaba revisando— perdida. Quien llega desde una cuenta vuelve a ella.
 *
 * En la URL y no en el `state` del router porque así sobrevive a una recarga,
 * como el resto de los criterios de la app (§21.1). En español, como las rutas.
 */
const RETURN_PARAM = 'volver'

/** Añade el «vuelve aquí» a un enlace de registrar. */
export function withReturn(to: string, from: string): string {
  return `${to}${to.includes('?') ? '&' : '?'}${RETURN_PARAM}=${encodeURIComponent(from)}`
}

/**
 * Destino de vuelta, o `null` si no lo hay.
 *
 * Solo rutas internas: un valor de la URL no se pasa a `navigate()` sin mirarlo
 * —`//otro.sitio` es una URL absoluta disfrazada de ruta—.
 */
export function returnPath(params: URLSearchParams): string | null {
  const value = params.get(RETURN_PARAM)
  return value && value.startsWith('/') && !value.startsWith('//') ? value : null
}
