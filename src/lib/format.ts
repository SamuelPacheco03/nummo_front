/**
 * Prefijo de moneda. COP es la moneda base del producto y se muestra con `$`
 * pegado a la cifra (`$350.000`); cualquier otra moneda se prefija con su código
 * ISO (`USD 1.200,00`) para que dos "pesos" distintos nunca se confundan.
 * Sin moneda explícita se asume la base.
 */
function moneyPrefix(currency?: string): string {
  if (!currency || currency === 'COP') return '$'
  return `${currency} `
}

/** Agrupa con es-CO (miles con `.`, decimales con `,`) y saca el signo delante del símbolo. */
function withPrefix(n: number, currency: string | undefined, minFrac: number, maxFrac: number): string {
  const body = Math.abs(n).toLocaleString('es-CO', {
    minimumFractionDigits: minFrac,
    maximumFractionDigits: maxFrac,
  })
  // El signo va antes del símbolo: `-$350.000`, no `$-350.000`.
  return `${n < 0 ? '-' : ''}${moneyPrefix(currency)}${body}`
}

/**
 * Formato de dinero POR DEFECTO, para leer: `$350.000`.
 *
 * Muestra decimales solo cuando existen (`$350.000,50`), así que no pierde
 * precisión: simplemente no imprime el `,00` que en COP es ruido en casi todas
 * las cifras. Es el que va en KPIs, gráficas, listas de resumen y paneles.
 *
 * Para columnas que se suman —tablas contables, comprobantes, confirmaciones y
 * formularios— usa `formatAmount`, que alinea siempre a dos decimales (§9).
 */
export function formatMoney(value: string | number | null | undefined, currency?: string): string {
  if (value == null || value === '') return '—'
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return String(value)
  const hasCents = Math.round(Math.abs(n) * 100) % 100 !== 0
  return withPrefix(n, currency, hasCents ? 2 : 0, 2)
}

/**
 * Formato de dinero con PRECISIÓN CONTABLE: `$350.000,00`, siempre dos decimales.
 *
 * Reservado a los contextos donde §9 exige no perder precisión: detalles,
 * movimientos, comprobantes, confirmaciones, formularios y tablas que se suman
 * —los dos decimales fijos son lo que mantiene la columna alineada—.
 *
 * El monto llega como string decimal del backend y esto es SOLO presentación:
 * nunca es fuente de verdad ni sirve para calcular saldos.
 */
export function formatAmount(value: string | null | undefined, currency?: string): string {
  if (value == null || value === '') return '—'
  const n = Number(value)
  if (Number.isNaN(n)) return value
  return withPrefix(n, currency, 2, 2)
}

/** Fecha de hoy en formato YYYY-MM-DD (para inputs date). */
export function todayISODate(): string {
  return new Date().toISOString().slice(0, 10)
}

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MONTH_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** Lunes 00:00 de la semana de `d` (en ms), para comparar semanas. */
function weekStartMs(d: Date): number {
  const monday = (d.getDay() + 6) % 7 // lunes = 0
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - monday).getTime()
}

/**
 * Fecha en lenguaje natural para lectura rápida (es-CO):
 *   hoy · ayer · anteayer · mañana · pasado mañana
 *   el <día> / el próximo <día> / el <día> pasado   (dentro de ±1 semana)
 *   "7 ago"  (más lejos, mismo año)  ·  "7 ago 2027"  (otro año)
 * Acepta 'YYYY-MM-DD' o ISO con hora (usa solo la parte de fecha, en local).
 * `today` es inyectable para tests.
 */
export function formatDateHuman(value: string | null | undefined, today: Date = new Date()): string {
  if (value == null || value === '') return '—'
  const [y, m, d] = value.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return value
  const target = new Date(y, m - 1, d)
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diff = Math.round((target.getTime() - base.getTime()) / 86_400_000)

  if (diff === 0) return 'hoy'
  if (diff === -1) return 'ayer'
  if (diff === -2) return 'anteayer'
  if (diff === 1) return 'mañana'
  if (diff === 2) return 'pasado mañana'

  const weekday = DAY_NAMES[target.getDay()]
  const sameWeek = weekStartMs(target) === weekStartMs(base)
  if (diff >= 3 && diff <= 7) return sameWeek ? `el ${weekday}` : `el próximo ${weekday}`
  if (diff <= -3 && diff >= -7) return sameWeek ? `el ${weekday}` : `el ${weekday} pasado`

  const label = `${target.getDate()} ${MONTH_ABBR[target.getMonth()]}`
  return target.getFullYear() === base.getFullYear() ? label : `${label} ${target.getFullYear()}`
}

/** 'YYYY-MM' → "ago" (año actual) o "ago 27" (otro año). Para ejes de gráficos. */
export function formatMonthLabel(ym: string, today: Date = new Date()): string {
  const [y, m] = ym.slice(0, 7).split('-').map(Number)
  if (!y || !m || m < 1 || m > 12) return ym
  const abbr = MONTH_ABBR[m - 1]
  return y === today.getFullYear() ? abbr : `${abbr} ${String(y).slice(2)}`
}

/**
 * Monto compacto para etiquetas y ejes de gráficos (es-CO): "$1,5 M" · "$900 k" · "$850".
 * Redondea a 1 decimal en miles/millones, así que es puramente visual: §9 solo lo
 * admite donde la reducción ayuda a leer, nunca en cifras que el usuario deba cuadrar.
 */
export function formatCompactAmount(value: string | number | null | undefined, currency?: string): string {
  if (value == null || value === '') return '—'
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return String(value)
  const abs = Math.abs(n)
  let body: string
  if (abs >= 1_000_000) body = `${(abs / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`
  else if (abs >= 1_000) body = `${(abs / 1_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} k`
  else body = abs.toLocaleString('es-CO', { maximumFractionDigits: 0 })
  return `${n < 0 ? '-' : ''}${moneyPrefix(currency)}${body}`
}

/** Iniciales de un nombre (para avatares). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Formatea un monto CRUDO (string decimal con punto, como lo espera el API) para
 * MOSTRARLO mientras se escribe: miles con `.` y decimales con `,` (es-CO).
 * Es puramente visual: `MoneyInput` guarda siempre el crudo con punto decimal.
 *   "1465775"    → "1.465.775"
 *   "1465775.5"  → "1.465.775,5"
 *   "1000."      → "1.000,"        (coma en curso mientras se teclea)
 */
export function groupAmountDisplay(raw: string | null | undefined): string {
  if (raw == null || raw === '') return ''
  const neg = raw.startsWith('-')
  const body = neg ? raw.slice(1) : raw
  const dot = body.indexOf('.')
  const intClean = (dot === -1 ? body : body.slice(0, dot)).replace(/\D/g, '')
  const dec = dot === -1 ? undefined : body.slice(dot + 1).replace(/\D/g, '')
  const grouped = intClean.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const intShown = grouped === '' && dec !== undefined ? '0' : grouped
  const shown = dec !== undefined ? `${intShown},${dec}` : grouped
  return (neg ? '-' : '') + shown
}

/**
 * Convierte lo que el usuario ve/teclea (con separadores) al valor CRUDO que
 * guarda el formulario y viaja al API: dígitos + punto decimal, sin agrupar.
 * Regla: el ÚLTIMO separador seguido de 0–2 dígitos es el decimal; el resto de
 * `.`/`,` son separadores de miles y se descartan. Así funciona tanto tecleando
 * como pegando (p. ej. pegar "1.465.775,50" → "1465775.50").
 */
export function parseAmountInput(input: string, opts?: { allowNegative?: boolean }): string {
  if (!input) return ''
  const neg = !!opts?.allowNegative && /^\s*-/.test(input)
  const s = input.replace(/[^\d.,]/g, '')
  if (s === '') return neg && /-/.test(input) ? '-' : ''
  const lastSep = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'))
  let raw: string
  if (lastSep === -1) {
    raw = s
  } else {
    const after = s.slice(lastSep + 1)
    if (/^\d{0,2}$/.test(after)) {
      const intPart = s.slice(0, lastSep).replace(/[.,]/g, '')
      raw = after.length ? `${intPart || '0'}.${after}` : `${intPart}.`
    } else {
      raw = s.replace(/[.,]/g, '')
    }
  }
  raw = raw.replace(/^0+(?=\d)/, '') // sin ceros a la izquierda
  return (neg ? '-' : '') + raw
}

/**
 * Plural en español, con la cantidad delante: `plural(1, 'cuenta', 'cuentas')`
 * → "1 cuenta"; con 8 → "8 cuentas".
 *
 * Existe para desterrar el "cuenta(s)", que es cómodo de escribir y delata que
 * nadie leyó la frase (§73: la voz de Nummo es clara, no de plantilla).
 */
export function plural(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}
