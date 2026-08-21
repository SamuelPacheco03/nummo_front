import { describe, expect, test } from 'vitest'
import {
  crossesMidnight,
  describeQuietWindow,
  isWithinQuietHours,
  quietMinutes,
  toMinutes,
} from './quiet-hours'

describe('la ventana que cruza medianoche', () => {
  test('22:00 → 07:00 cruza, y dura nueve horas', () => {
    expect(crossesMidnight('22:00', '07:00')).toBe(true)
    expect(quietMinutes('22:00', '07:00')).toBe(540)
  })

  test('una ventana dentro del mismo día no cruza', () => {
    expect(crossesMidnight('13:00', '15:00')).toBe(false)
    expect(quietMinutes('13:00', '15:00')).toBe(120)
  })

  test('con los dos extremos iguales no hay ventana que cruzar', () => {
    expect(crossesMidnight('08:00', '08:00')).toBe(false)
    expect(quietMinutes('08:00', '08:00')).toBe(0)
  })
})

describe('qué momentos caen dentro', () => {
  test('la madrugada de una ventana nocturna está en silencio', () => {
    expect(isWithinQuietHours('23:00', '22:00', '07:00')).toBe(true)
    expect(isWithinQuietHours('00:30', '22:00', '07:00')).toBe(true)
    expect(isWithinQuietHours('06:59', '22:00', '07:00')).toBe(true)
  })

  test('el día no', () => {
    expect(isWithinQuietHours('07:00', '22:00', '07:00')).toBe(false)
    expect(isWithinQuietHours('12:00', '22:00', '07:00')).toBe(false)
    expect(isWithinQuietHours('21:59', '22:00', '07:00')).toBe(false)
  })

  test('el inicio entra y el fin no: a las 07:00 ya se puede escribir', () => {
    expect(isWithinQuietHours('22:00', '22:00', '07:00')).toBe(true)
    expect(isWithinQuietHours('07:00', '22:00', '07:00')).toBe(false)
  })

  test('una ventana de cero minutos no silencia ninguna hora', () => {
    expect(isWithinQuietHours('08:00', '08:00', '08:00')).toBe(false)
    expect(isWithinQuietHours('03:00', '08:00', '08:00')).toBe(false)
  })

  test('una ventana diurna solo silencia su tramo', () => {
    expect(isWithinQuietHours('14:00', '13:00', '15:00')).toBe(true)
    expect(isWithinQuietHours('16:00', '13:00', '15:00')).toBe(false)
    expect(isWithinQuietHours('03:00', '13:00', '15:00')).toBe(false)
  })
})

describe('cómo se cuenta', () => {
  test('la nocturna avisa de que termina al día siguiente', () => {
    const window = describeQuietWindow('22:00', '07:00')
    expect(window.text).toBe('De 22:00 a 07:00 del día siguiente')
    expect(window.crossesMidnight).toBe(true)
    expect(window.duration).toBe('9 horas')
  })

  test('la diurna no lo dice, porque no pasa', () => {
    const window = describeQuietWindow('13:00', '15:30')
    expect(window.text).toBe('De 13:00 a 15:30')
    expect(window.crossesMidnight).toBe(false)
    expect(window.duration).toBe('2 horas y 30 minutos')
  })

  test('la vacía se nombra por lo que hace, no por sus horas', () => {
    const window = describeQuietWindow('08:00', '08:00')
    expect(window.isEmpty).toBe(true)
    expect(window.text).toContain('cualquier hora')
  })

  test('una hora que no es HH:mm no revienta la pantalla', () => {
    expect(toMinutes('25:00')).toBeNull()
    expect(toMinutes('')).toBeNull()
    expect(quietMinutes('nope', '07:00')).toBeNull()
    expect(describeQuietWindow('nope', '07:00').text).toBe('Horas sin definir')
  })

  test('el singular se escribe en singular', () => {
    expect(describeQuietWindow('22:00', '23:00').duration).toBe('1 hora')
    expect(describeQuietWindow('22:00', '22:01').duration).toBe('1 minuto')
  })
})
