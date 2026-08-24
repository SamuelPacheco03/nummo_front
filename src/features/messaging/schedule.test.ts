import { expect, test } from 'vitest'
import {
  describeSendableRange,
  describeStages,
  groupWeek,
  overdueEclipsesDueDate,
  sendableHours,
} from './schedule'
import { horarioLegal } from './policy-fixture'

/* ---------- La semana ---------- */

test('la semana colombiana se agrupa en tres renglones, no en siete', () => {
  // Cinco filas idénticas de lunes a viernes no las lee nadie: lo que se busca
  // de un vistazo es «entre semana una cosa, el sábado otra, el domingo nada».
  expect(groupWeek(horarioLegal().week)).toEqual([
    { label: 'Lunes a viernes', window: { start: '07:00', end: '19:00' } },
    { label: 'Sábado', window: { start: '08:00', end: '15:00' } },
    { label: 'Domingo', window: null },
  ])
})

test('solo agrupa días consecutivos: un hueco en medio parte el grupo', () => {
  /*
    «Lunes y miércoles» agrupado escondería que el martes es distinto, que es
    justo el dato que alguien viene a comprobar.
  */
  const week = {
    '1': { start: '07:00', end: '19:00' },
    '2': null,
    '3': { start: '07:00', end: '19:00' },
    '4': null,
    '5': null,
    '6': null,
    '7': null,
  }
  expect(groupWeek(week).map((g) => g.label)).toEqual([
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves a domingo',
  ])
})

test('dos días seguidos se dicen con «y», que un rango de dos suena roto', () => {
  const week = {
    '1': { start: '08:00', end: '17:00' },
    '2': { start: '08:00', end: '17:00' },
    '3': null,
    '4': null,
    '5': null,
    '6': null,
    '7': null,
  }
  expect(groupWeek(week)[0]?.label).toBe('Lunes y martes')
})

test('«no se contacta» no es lo mismo que una franja vacía', () => {
  // El domingo llega como `null` y tiene que poder distinguirse: pintarlo como
  // «de 00:00 a 00:00» diría que se escribe a medianoche.
  const domingo = groupWeek(horarioLegal().week).at(-1)
  expect(domingo?.window).toBeNull()
})

/* ---------- La hora de envío ---------- */

test('la última hora ofrecible es las 14:00, nunca las 15:00', () => {
  /*
    La franja acaba a las 14:59 porque el sábado cierra a las tres. Ofrecer las
    15:00 sería ofrecer un valor que el PUT rechaza con un 422.
  */
  const horas = sendableHours({ earliest: '08:00', latest: '14:59' })
  expect(horas[0]).toBe('08:00')
  expect(horas.at(-1)).toBe('14:00')
  expect(horas).not.toContain('15:00')
})

test('sin franja legal se ofrece el día entero', () => {
  // `null` es «no hay restricción que imponer», no «no se puede elegir».
  const horas = sendableHours(null)
  expect(horas).toHaveLength(24)
  expect(horas[0]).toBe('00:00')
  expect(horas.at(-1)).toBe('23:00')
})

test('el valor guardado aparece aunque no caiga en hora en punto', () => {
  /*
    Un desplegable que no contiene lo que hay seleccionado se pinta en blanco, y
    guardar desde ahí escribiría otra hora sin que nadie lo pidiera.
  */
  const horas = sendableHours({ earliest: '08:00', latest: '14:59' }, '12:30')
  expect(horas).toContain('12:30')
  expect(horas.indexOf('12:30')).toBe(horas.indexOf('12:00') + 1)
})

test('el valor guardado no se duplica si ya está en la lista', () => {
  const horas = sendableHours({ earliest: '08:00', latest: '14:59' }, '12:00')
  expect(horas.filter((h) => h === '12:00')).toHaveLength(1)
})

test('la franja se dice en una frase', () => {
  expect(describeSendableRange({ earliest: '08:00', latest: '14:59' })).toBe('08:00 a 14:59')
  expect(describeSendableRange(null)).toBeNull()
})

/* ---------- Las tres etapas ---------- */

test('las etapas encendidas se cuentan y se dicen en orden', () => {
  expect(describeStages({ daysBefore: 3, remindOnDueDate: true, daysAfter: 1 })).toEqual({
    count: 3,
    parts: ['3 días antes', 'el día que vence', '1 día después'],
  })
})

test('el singular no se dice en plural: «1 día», no «1 días»', () => {
  const { parts } = describeStages({ daysBefore: 1, remindOnDueDate: false, daysAfter: 1 })
  expect(parts).toEqual(['1 día antes', '1 día después'])
})

test('apagarlas todas deja la cuenta sin un solo aviso, y se cuenta como cero', () => {
  expect(describeStages({ daysBefore: null, remindOnDueDate: false, daysAfter: null })).toEqual({
    count: 0,
    parts: [],
  })
})

test('`daysAfter: 0` es el mismo día del vencimiento, no «cero días después»', () => {
  const { parts } = describeStages({ daysBefore: null, remindOnDueDate: false, daysAfter: 0 })
  expect(parts).toEqual(['el mismo día del vencimiento'])
})

test('con `daysAfter: 0` la mora tapa al aviso de «vence hoy»', () => {
  // Se mira primero, así que la casilla de «el día que vence» queda marcada sin
  // hacer nada. No es un error, pero callarlo sí lo parece.
  expect(overdueEclipsesDueDate({ daysBefore: null, remindOnDueDate: true, daysAfter: 0 })).toBe(true)
  expect(overdueEclipsesDueDate({ daysBefore: null, remindOnDueDate: true, daysAfter: 1 })).toBe(false)
  expect(overdueEclipsesDueDate({ daysBefore: null, remindOnDueDate: false, daysAfter: 0 })).toBe(false)
})
