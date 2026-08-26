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
  /**
   * Concepto de cobro o categoría de gasto. Es el **id**, no el nombre: es lo
   * único que traen `ReceivableBalance` y `ExpenseBalance` (§95.19), y quien
   * pinta la fila lo cruza contra el catálogo que ya tiene cargado.
   */
  catalogId?: string
  /** `displayStatus` del contrato. Lo traduce a palabras el `statusOf` de cada cara. */
  status: string
}

/** Lo mínimo para repartir dinero sobre algo: cuánto cabe y dónde. */
interface Fillable {
  id: string
  balance: string
}

/** Un reparto en curso: id de la cuenta → importe crudo, tal como se teclea. */
export type Allocation = Record<string, string>

/**
 * Céntimos de tolerancia. Comparar dinero en coma flotante sin esto miente:
 * `0.1 + 0.2 > 0.3` es `true` y un reparto que cuadra se marca como pasado.
 *
 * Vive aquí porque lo usan las tres pantallas que reparten, y tres constantes
 * iguales son tres sitios donde afinar el redondeo por separado.
 */
export const MONEY_EPSILON = 0.001

/**
 * Lo asignado hasta ahora.
 *
 * Vive aquí y no en cada pantalla porque **la aritmética del dinero no se
 * escribe dos veces**: la reparten el formulario de registrar y el diálogo de
 * anticipos, y tenerla duplicada es tener dos redondeos que se separan (§94).
 */
export function sumAllocations(alloc: Allocation): number {
  return Object.values(alloc).reduce((sum, v) => sum + (Number(v) || 0), 0)
}

/** Todas las cuentas, cada una por su saldo entero. */
export function fillAll(accounts: Fillable[]): Allocation {
  const next: Allocation = {}
  for (const account of accounts) next[account.id] = Number(account.balance).toFixed(2)
  return next
}

/**
 * Reparte `amount` de la primera cuenta a la última, sin pasarse de cada saldo.
 *
 * El orden lo pone quien llama —las listas llegan por vencimiento ascendente—,
 * así que lo más antiguo se salda primero, que es como se cobra.
 */
export function spreadAmount(accounts: Fillable[], amount: number): Allocation {
  let remaining = amount
  const next: Allocation = {}
  for (const account of accounts) {
    if (remaining <= 0) break
    const take = Math.min(Number(account.balance), remaining)
    if (take > 0) {
      next[account.id] = take.toFixed(2)
      remaining -= take
    }
  }
  return next
}

/** Las filas con dinero de verdad, listas para el cuerpo del POST. */
export function allocationEntries(alloc: Allocation): { id: string; amount: string }[] {
  return Object.entries(alloc)
    .filter(([, amount]) => Number(amount) > 0)
    .map(([id, amount]) => ({ id, amount: Number(amount).toFixed(2) }))
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

/**
 * Las palabras del **selector de cuentas**, que es el mismo en las tres
 * pantallas que reparten dinero: registrar un pago, registrar un egreso y
 * aplicar un anticipo (§11.1.17).
 */
export interface AccountPickerCopy {
  /** La pregunta del encabezado: «¿Qué cuentas cubre?» / «¿Qué gastos cubre?». */
  title: string
  /** Cómo se llama lo que está abierto: `['gasto abierto', 'gastos abiertos']`. */
  open: [singular: string, plural: string]
  /** Lo mismo, a secas: `['gasto', 'gastos']`. «Se aplica completo a 3 gastos». */
  unit: [singular: string, plural: string]
  /** «Seleccionar todas» / «Seleccionar todos». El género cambia de lado. */
  selectAll: string
  /** «Quitar todas» / «Quitar todos». */
  clearAll: string
  /** Qué pasa si esta contraparte no tiene nada abierto. */
  empty: string
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
  /** Las palabras del selector de cuentas, compartidas con el diálogo de anticipos. */
  picker: AccountPickerCopy
  /**
   * Dónde va lo que sobre, como **cola de una frase**: se lee «Sobran $120.000,
   * que quedan {leftover}». Así la cifra entra en la frase en vez de vivir en
   * una nota aparte que solo aparecía cuando ya sobraba.
   */
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

/**
 * Param que dice **desde qué cuenta se entró**, para dejarla ya marcada.
 *
 * Quien pulsa «Cobrar» en la pensión de julio viene a cobrar **esa**, y llegaba
 * a un formulario con cinco filas vacías y ninguna pista de cuál era. El caso
 * más común —una cuenta, entera— queda así en un toque.
 *
 * En español y en la URL, por lo mismo que `volver`: sobrevive a una recarga y
 * el enlace cuenta lo que se está haciendo.
 */
const APPLY_PARAM = 'aplicar'

/** Añade el «esta cuenta ya viene marcada» a un enlace de registrar. */
export function withApply(to: string, accountId: string): string {
  return `${to}${to.includes('?') ? '&' : '?'}${APPLY_PARAM}=${encodeURIComponent(accountId)}`
}

/** La cuenta con la que abrir el formulario ya marcada, o `null`. */
export function applyId(params: URLSearchParams): string | null {
  return params.get(APPLY_PARAM) || null
}
