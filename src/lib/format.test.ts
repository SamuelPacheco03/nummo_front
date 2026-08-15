import { describe, expect, it } from 'vitest'
import { formatDateHuman, groupAmountDisplay, parseAmountInput } from './format'

describe('formatDateHuman', () => {
  const today = new Date(2026, 7, 14) // viernes 14 ago 2026

  it('relativas cercanas', () => {
    expect(formatDateHuman('2026-08-14', today)).toBe('hoy')
    expect(formatDateHuman('2026-08-13', today)).toBe('ayer')
    expect(formatDateHuman('2026-08-12', today)).toBe('anteayer')
    expect(formatDateHuman('2026-08-15', today)).toBe('mañana')
    expect(formatDateHuman('2026-08-16', today)).toBe('pasado mañana')
  })

  it('días de la semana', () => {
    expect(formatDateHuman('2026-08-11', today)).toBe('el martes') // esta semana
    expect(formatDateHuman('2026-08-09', today)).toBe('el domingo pasado') // semana pasada
    expect(formatDateHuman('2026-08-19', today)).toBe('el próximo miércoles') // próxima semana
  })

  it('lejanas: día + mes, con año solo si difiere', () => {
    expect(formatDateHuman('2026-12-25', today)).toBe('25 dic')
    expect(formatDateHuman('2027-01-05', today)).toBe('5 ene 2027')
    expect(formatDateHuman('2026-08-14T09:30:00.000Z', today)).toBe('hoy') // ISO con hora
  })

  it('vacío → guion', () => {
    expect(formatDateHuman('', today)).toBe('—')
    expect(formatDateHuman(null, today)).toBe('—')
  })
})

describe('groupAmountDisplay', () => {
  it('agrupa miles con punto (es-CO)', () => {
    expect(groupAmountDisplay('1465775')).toBe('1.465.775')
    expect(groupAmountDisplay('1000')).toBe('1.000')
    expect(groupAmountDisplay('999')).toBe('999')
    expect(groupAmountDisplay('')).toBe('')
  })

  it('muestra decimales con coma y conserva la coma en curso', () => {
    expect(groupAmountDisplay('1465775.5')).toBe('1.465.775,5')
    expect(groupAmountDisplay('1465775.00')).toBe('1.465.775,00')
    expect(groupAmountDisplay('1000.')).toBe('1.000,')
  })
})

describe('parseAmountInput', () => {
  it('deja solo dígitos + punto decimal (crudo para el API)', () => {
    expect(parseAmountInput('1.465.775')).toBe('1465775')
    expect(parseAmountInput('1.465.775,50')).toBe('1465775.50')
    expect(parseAmountInput('1465775')).toBe('1465775')
  })

  it('el último separador con 1–2 dígitos es el decimal', () => {
    expect(parseAmountInput('1465775,5')).toBe('1465775.5')
    expect(parseAmountInput('1.234,56')).toBe('1234.56')
  })

  it('trata un punto pegado como miles cuando le siguen 3 dígitos', () => {
    expect(parseAmountInput('1.234')).toBe('1234')
  })

  it('ignora basura y ceros a la izquierda', () => {
    expect(parseAmountInput('  $ 12.000 COP ')).toBe('12000')
    expect(parseAmountInput('007')).toBe('7')
    expect(parseAmountInput('')).toBe('')
  })

  it('ida y vuelta: display → crudo → display', () => {
    const raw = parseAmountInput('2.500.000,75')
    expect(raw).toBe('2500000.75')
    expect(groupAmountDisplay(raw)).toBe('2.500.000,75')
  })
})
