/**
 * Las horas de silencio de la política de cobranza.
 *
 * Dos cosas que hay que tener claras antes de tocar esto, porque las dos se
 * hacen mal solas:
 *
 * 1. **La ventana normalmente cruza la medianoche.** `22:00 → 07:00` es el caso
 *    corriente, no el raro. Cualquier cálculo que asuma `inicio < fin` —una
 *    validación, una barra de progreso, un «duración = fin − inicio»— da
 *    negativo justo en la configuración que va a tener casi todo el mundo.
 * 2. **El silencio aplaza, no cancela.** Un aviso que cae a las 23:00 sale a la
 *    mañana siguiente. Nada de lo que se escriba aquí puede sugerir que el
 *    mensaje se pierde.
 */

/** `"22:00"` → 1320. Un `HH:mm` que no lo sea devuelve `null`. */
export function toMinutes(time: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

/**
 * ¿La ventana pasa por medianoche?
 *
 * Es `inicio > fin` y no `>=`: con los dos iguales no hay ventana que cruzar,
 * hay ventana de cero minutos.
 */
export function crossesMidnight(start: string, end: string): boolean {
  const from = toMinutes(start)
  const to = toMinutes(end)
  if (from == null || to == null) return false
  return from > to
}

/**
 * Cuánto dura la ventana, en minutos, contando el salto de día.
 *
 * `22:00 → 07:00` son nueve horas, no menos quince.
 */
export function quietMinutes(start: string, end: string): number | null {
  const from = toMinutes(start)
  const to = toMinutes(end)
  if (from == null || to == null) return null
  // El módulo es lo que hace que cruzar medianoche no sea un caso aparte:
  // (420 − 1320 + 1440) % 1440 = 540.
  return (to - from + 1440) % 1440
}

/**
 * ¿Este momento cae dentro de la ventana?
 *
 * El inicio entra y el fin no: a las 07:00 ya se puede escribir, que es lo que
 * significa «hasta las 07:00». Con una ventana de cero minutos nunca es cierto.
 */
export function isWithinQuietHours(time: string, start: string, end: string): boolean {
  const at = toMinutes(time)
  const from = toMinutes(start)
  const length = quietMinutes(start, end)
  if (at == null || from == null || length == null || length === 0) return false
  return (at - from + 1440) % 1440 < length
}

export interface QuietWindow {
  /** La franja en una frase: «De 22:00 a 07:00 del día siguiente». */
  text: string
  crossesMidnight: boolean
  /** Los dos extremos iguales: no se aplaza nada. */
  isEmpty: boolean
  /** Cuánto dura, ya en palabras: «9 horas». */
  duration: string
}

/**
 * La ventana dicha en una línea, para ponerla bajo los dos selectores.
 *
 * Existe porque dos campos de hora sueltos son un acertijo: puestos a `22:00` y
 * `07:00` no dicen por sí solos que la franja pasa por la madrugada, y ese es
 * justo el dato que hay que confirmar de un vistazo.
 *
 * Con los dos extremos iguales la franja mide cero minutos y no hay nada que
 * aplazar. Es aritmética de la propia ventana, no una regla del backend.
 */
export function describeQuietWindow(start: string, end: string): QuietWindow {
  const length = quietMinutes(start, end)
  if (length == null) {
    return { text: 'Horas sin definir', crossesMidnight: false, isEmpty: false, duration: '' }
  }
  if (length === 0) {
    return {
      text: 'Sin franja de silencio: se escribe a cualquier hora',
      crossesMidnight: false,
      isEmpty: true,
      duration: '',
    }
  }
  const overnight = crossesMidnight(start, end)
  return {
    text: `De ${start} a ${end}${overnight ? ' del día siguiente' : ''}`,
    crossesMidnight: overnight,
    isEmpty: false,
    duration: formatDuration(length),
  }
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  const h = hours === 1 ? '1 hora' : `${hours} horas`
  const m = rest === 1 ? '1 minuto' : `${rest} minutos`
  if (hours === 0) return m
  if (rest === 0) return h
  return `${h} y ${m}`
}
