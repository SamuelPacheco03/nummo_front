/**
 * **La ventana de fechas de los paneles**, y la de antes.
 *
 * `GET /stats` mide una ventana y solo una: el contrato no devuelve el período anterior.
 * Pero «¿esto está subiendo?» es la primera pregunta de un panel de actividad, y la
 * respuesta no hay que inventarla — se pide. La comparación de estas pantallas son **dos
 * llamadas reales** a la misma ruta, no una estimación (§70: un dato que no se tiene no se
 * inventa; este sí se tiene, solo que hay que ir a buscarlo).
 *
 * Las fechas son `YYYY-MM-DD` en UTC, que es lo que acepta el backend.
 */

const DIA_MS = 86_400_000

function toISO(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

function toMs(date: string): number {
  return Date.parse(`${date}T00:00:00Z`)
}

/** Cuántos días cubre la ventana, contando los dos extremos. */
export function rangeDays(from: string, to: string): number {
  const days = Math.round((toMs(to) - toMs(from)) / DIA_MS) + 1
  return days > 0 ? days : 1
}

/**
 * La ventana inmediatamente anterior, del mismo tamaño.
 *
 * Del mismo tamaño y pegada, no «el mes pasado»: comparar catorce días con treinta diría
 * que el uso se hundió cuando solo cambió la regla de medir.
 */
export function previousRange(from: string, to: string): { from: string; to: string } {
  const days = rangeDays(from, to)
  const end = toMs(from) - DIA_MS
  return { from: toISO(end - (days - 1) * DIA_MS), to: toISO(end) }
}

/** Treinta días: donde se nota un cambio de prompt sin ahogar la gráfica. */
export function defaultRange(today = new Date()): { from: string; to: string } {
  const to = today.toISOString().slice(0, 10)
  return { from: toISO(toMs(to) - 29 * DIA_MS), to }
}

/**
 * Cuánto cambió una cifra respecto al período anterior, en tanto por uno.
 *
 * `null` cuando no hay con qué comparar: sin período anterior, o con un anterior en cero,
 * donde el porcentaje sería infinito y lo honesto es no dar ninguno.
 */
export function delta(current: number, previous: number | undefined): number | null {
  if (previous === undefined || previous === 0) return null
  return (current - previous) / previous
}
