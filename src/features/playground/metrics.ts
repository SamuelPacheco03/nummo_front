import type { PlaygroundTokenUsage } from '@/api/generated/model'

/**
 * **Las cifras de un turno, contadas sin mentir.**
 *
 * Todo lo que se pinta en la traza pasa por aquí, y existe por una razón concreta: los
 * dos números que este panel enseña —tokens y coste— tienen un valor que **no es un
 * número**, y tratarlo como cero convierte el panel en un informe falso.
 */

/** Lo que se pinta cuando el proveedor no reportó el dato. */
export const SIN_DATO = '—'

const ENTEROS = new Intl.NumberFormat('es-CO')

/**
 * **`null` no es cero.**
 *
 * Un proveedor que no reporta tokens cacheados manda `null`, y eso significa «no lo sé».
 * Pintarlo como 0 inventa un ahorro de caché que no ocurrió — y es exactamente el número
 * que alguien va a mirar para decidir si el prompt cacheado sirve de algo.
 */
export function formatTokens(value: number | null | undefined): string {
  return typeof value === 'number' ? ENTEROS.format(value) : SIN_DATO
}

/** Tokens del turno: entrada + salida, y solo si alguno de los dos se sabe. */
export function totalTokens(usage: PlaygroundTokenUsage): number | null {
  if (usage.input == null && usage.output == null) return null
  return (usage.input ?? 0) + (usage.output ?? 0)
}

/**
 * Qué parte de la entrada vino de caché, en porcentaje.
 *
 * Solo cuando **las dos** cifras se saben: con `cacheRead` a `null` no hay ahorro que
 * calcular, y con la entrada a cero no hay sobre qué.
 */
export function cacheShare(usage: PlaygroundTokenUsage): number | null {
  if (usage.cacheRead == null || usage.input == null || usage.input <= 0) return null
  return Math.round((usage.cacheRead / usage.input) * 100)
}

const USD = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 4, maximumFractionDigits: 6 })

/** Lo que se dice cuando el modelo corrió pero nadie le puso precio a sus tokens. */
export const SIN_PRECIO = 'Sin precio configurado'

/**
 * El coste llega en **micro-dólares** (1 USD = 1.000.000).
 *
 * `null` es «ese modelo no tiene precio configurado», que no es lo mismo que salir
 * gratis: enseñar `$0` ahí es la versión monetaria del cero de `formatTokens`.
 *
 * Va con su código ISO y no con `$` (§9.2): la moneda de la app es el peso, y dos
 * «pesos» distintos con el mismo símbolo son un error de lectura esperando a ocurrir.
 */
export function formatCost(microUsd: number | null | undefined): string {
  if (typeof microUsd !== 'number') return SIN_PRECIO
  return `USD ${USD.format(microUsd / 1_000_000)}`
}

/**
 * Milisegundos como los lee una persona: por debajo del segundo, enteros; por encima,
 * segundos con un decimal, que es la precisión que se puede comparar de un vistazo.
 */
export function formatMs(ms: number | null | undefined): string {
  if (typeof ms !== 'number') return SIN_DATO
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(1).replace('.', ',')} s`
}

export interface PhaseSlice {
  key: string
  label: string
  ms: number
  /** Porcentaje del turno, para la barra apilada. */
  pct: number
}

interface Timings {
  totalMs: number
  resolveMs: number
  contextMs: number
  engineMs: number
  toolsMs: number
  persistMs: number
}

/**
 * Las fases de un turno como tramos de una barra apilada.
 *
 * `toolsMs` **vive dentro de `engineMs`**, así que el motor se pinta descontándolas: si
 * se apilaran las dos enteras, la barra sumaría más que el turno y un turno comido por
 * las herramientas parecería un turno lento por el modelo — que es justo la confusión que
 * la barra viene a deshacer.
 *
 * Lo que no cuadra con `totalMs` va a «resto» en vez de estirar las otras: la diferencia
 * es tiempo real que el turno gastó en algo que el backend no desglosa.
 */
export function phaseSlices(timings: Timings): PhaseSlice[] {
  const engineSinTools = Math.max(0, timings.engineMs - timings.toolsMs)
  const partes = [
    { key: 'resolve', label: 'Credencial', ms: timings.resolveMs },
    { key: 'context', label: 'Contexto', ms: timings.contextMs },
    { key: 'engine', label: 'Modelo', ms: engineSinTools },
    { key: 'tools', label: 'Herramientas', ms: timings.toolsMs },
    { key: 'persist', label: 'Archivar', ms: timings.persistMs },
  ]
  const contadas = partes.reduce((sum, p) => sum + p.ms, 0)
  const resto = Math.max(0, timings.totalMs - contadas)
  if (resto > 0) partes.push({ key: 'rest', label: 'Resto', ms: resto })

  const total = Math.max(timings.totalMs, contadas)
  if (total <= 0) return []
  return partes
    .filter((p) => p.ms > 0)
    .map((p) => ({ ...p, pct: (p.ms / total) * 100 }))
}

/**
 * Los montos que la respuesta dijo y ninguna herramienta devolvió. Llegan en **centavos**
 * (§88.4: el dinero no se recalcula aquí; esto solo lo pone en pesos para leerlo).
 */
export function offenderAmount(cents: number): string {
  return (cents / 100).toFixed(2)
}
