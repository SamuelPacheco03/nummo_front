import type { CollectionPolicy, CollectionPolicySchedule } from '@/api/generated/model'

/** Días ISO: 1 es lunes y 7 domingo, que es como los numera el contrato. */
const DAY_NAMES = [
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
  'domingo',
] as const

type Window = { start: string; end: string } | null

export interface DayRange {
  /** «Lunes a viernes», «Sábado», «Domingo». */
  label: string
  /** `null` es **no se contacta**, que no es lo mismo que una franja vacía. */
  window: Window
}

function sameWindow(a: Window, b: Window): boolean {
  if (a === null || b === null) return a === b
  return a.start === b.start && a.end === b.end
}

/**
 * La semana en renglones legibles, **agrupando los días que comparten franja**.
 *
 * Siete filas idénticas de lunes a viernes no las lee nadie: lo que hay que ver
 * de un vistazo es que entre semana es una cosa, el sábado otra y el domingo no
 * se escribe. Se agrupan solo días **consecutivos**, porque «lunes y miércoles»
 * agrupado escondería que el martes es distinto.
 */
export function groupWeek(week: CollectionPolicySchedule['week']): DayRange[] {
  const days = DAY_NAMES.map((name, i) => ({ name, window: (week[String(i + 1)] ?? null) as Window }))

  const groups: { from: number; to: number; window: Window }[] = []
  for (const [i, day] of days.entries()) {
    const last = groups.at(-1)
    if (last && sameWindow(last.window, day.window)) last.to = i
    else groups.push({ from: i, to: i, window: day.window })
  }

  return groups.map(({ from, to, window }) => {
    const first = DAY_NAMES[from]
    const label =
      from === to
        ? first
        : // Dos seguidos se dicen con «y»: «lunes a martes» suena a rango roto.
          to === from + 1
          ? `${first} y ${DAY_NAMES[to]}`
          : `${first} a ${DAY_NAMES[to]}`
    return { label: label.charAt(0).toUpperCase() + label.slice(1), window }
  })
}

function toMinutes(time: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time)
  if (!match) return null
  const [hours, minutes] = [Number(match[1]), Number(match[2])]
  return hours > 23 || minutes > 59 ? null : hours * 60 + minutes
}

/**
 * Las horas que se pueden elegir para que salgan los avisos.
 *
 * **La franja es `[inicio, fin]` en minutos pero se ofrece de hora en hora**, así
 * que con `08:00`–`14:59` el último valor ofrecible es las `14:00` y **las 15:00
 * no aparecen**: caerían fuera y el `PUT` las rechazaría con un 422.
 *
 * `range` en `null` significa que no hay restricción que imponer —no hay ley de
 * horario en ese país— y entonces se ofrece el día entero.
 *
 * `current` se cuela en la lista aunque no caiga en una hora en punto: el valor
 * guardado tiene que poder verse, y un desplegable que no contiene lo que hay
 * seleccionado se pinta en blanco y borra el dato al guardar.
 */
export function sendableHours(
  range: CollectionPolicySchedule['sendableRange'],
  current?: string,
): string[] {
  const from = range ? (toMinutes(range.earliest) ?? 0) : 0
  const to = range ? (toMinutes(range.latest) ?? 24 * 60 - 1) : 24 * 60 - 1

  const hours: string[] = []
  for (let m = Math.ceil(from / 60) * 60; m <= to; m += 60) {
    hours.push(`${String(m / 60).padStart(2, '0')}:00`)
  }

  const value = current?.slice(0, 5)
  if (value && !hours.includes(value)) {
    const minutes = toMinutes(value)
    if (minutes !== null) {
      hours.push(value)
      hours.sort()
    }
  }
  return hours
}

/** «08:00 a 14:59» — la franja elegible dicha en una frase. */
export function describeSendableRange(range: CollectionPolicySchedule['sendableRange']): string | null {
  return range ? `${range.earliest} a ${range.latest}` : null
}

type Stages = Pick<CollectionPolicy, 'daysBefore' | 'remindOnDueDate' | 'daysAfter'>

/**
 * Cuántos avisos recibe una cuenta por cobrar **en toda su vida**, y cuándo.
 *
 * Es la frase que evita la pregunta que va a llegar igual: cada etapa dispara
 * **una sola vez**, así que una deuda que nadie paga deja de recibir avisos. No
 * es un tope que el backend comprueba —no existen más etapas—, y por eso la
 * cifra sale de `maxRemindersPerReceivable` en vez de escribirse aquí.
 */
export function describeStages(stages: Stages): { count: number; parts: string[] } {
  const parts: string[] = []
  if (stages.daysBefore != null) {
    parts.push(stages.daysBefore === 1 ? '1 día antes' : `${stages.daysBefore} días antes`)
  }
  if (stages.remindOnDueDate) parts.push('el día que vence')
  if (stages.daysAfter != null) {
    parts.push(
      stages.daysAfter === 0
        ? 'el mismo día del vencimiento'
        : stages.daysAfter === 1
          ? '1 día después'
          : `${stages.daysAfter} días después`,
    )
  }
  return { count: parts.length, parts }
}

/**
 * Con `daysAfter: 0` el aviso de mora sale **el mismo día del vencimiento y le
 * gana** al de «vence hoy», porque se mira primero. No es un error, pero deja
 * una casilla marcada que no hace nada, y eso hay que decirlo.
 */
export function overdueEclipsesDueDate(stages: Stages): boolean {
  return stages.daysAfter === 0 && stages.remindOnDueDate
}
