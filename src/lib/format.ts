/**
 * Formatea un monto que llega como string decimal del backend, SOLO para mostrar.
 * Nunca se usa como fuente de verdad ni para calcular saldos.
 */
export function formatAmount(value: string | null | undefined, currency?: string): string {
  if (value == null || value === '') return '—'
  const n = Number(value)
  if (Number.isNaN(n)) return value
  const s = n.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return currency ? `${currency} ${s}` : s
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
 * Monto compacto para etiquetas de gráficos (es-CO): "1,5 M" · "900 k" · "850".
 * Redondea a 1 decimal en miles/millones. Puramente visual.
 */
export function formatCompactAmount(value: string | number | null | undefined, currency?: string): string {
  if (value == null || value === '') return '—'
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return String(value)
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  let body: string
  if (abs >= 1_000_000) body = `${(abs / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`
  else if (abs >= 1_000) body = `${(abs / 1_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} k`
  else body = abs.toLocaleString('es-CO', { maximumFractionDigits: 0 })
  const out = `${sign}${body}`
  return currency ? `${currency} ${out}` : out
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
