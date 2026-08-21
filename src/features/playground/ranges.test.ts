import { expect, test } from 'vitest'
import { defaultRange, delta, previousRange, rangeDays } from './ranges'

test('una ventana cuenta sus dos extremos', () => {
  expect(rangeDays('2026-08-01', '2026-08-01')).toBe(1)
  expect(rangeDays('2026-08-01', '2026-08-30')).toBe(30)
  // Una ventana al revés no devuelve días negativos: se lee como un día.
  expect(rangeDays('2026-08-30', '2026-08-01')).toBe(1)
})

test('el período anterior es del mismo tamaño y va pegado', () => {
  /*
    Del mismo tamaño y pegado, no «el mes pasado»: comparar catorce días con treinta diría
    que el uso se hundió cuando solo cambió la regla de medir.
  */
  expect(previousRange('2026-08-01', '2026-08-30')).toEqual({
    from: '2026-07-02',
    to: '2026-07-31',
  })
  expect(previousRange('2026-08-15', '2026-08-15')).toEqual({
    from: '2026-08-14',
    to: '2026-08-14',
  })
})

test('el período anterior cruza el cambio de año sin despeinarse', () => {
  expect(previousRange('2026-01-01', '2026-01-07')).toEqual({
    from: '2025-12-25',
    to: '2025-12-31',
  })
})

test('la ventana por defecto son treinta días hasta hoy', () => {
  expect(defaultRange(new Date('2026-08-20T15:00:00Z'))).toEqual({
    from: '2026-07-22',
    to: '2026-08-20',
  })
})

test('sin con qué comparar no hay porcentaje', () => {
  expect(delta(120, undefined)).toBeNull()
  // Dividir entre cero da infinito, y «+∞ %» no es una lectura: es un adorno.
  expect(delta(120, 0)).toBeNull()
  expect(delta(120, 100)).toBeCloseTo(0.2)
  expect(delta(80, 100)).toBeCloseTo(-0.2)
})
