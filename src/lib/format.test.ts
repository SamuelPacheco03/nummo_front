import { describe, expect, it } from 'vitest'
import {
  formatAmount,
  formatCompactAmount,
  formatDateHuman,
  formatMoney,
  formatMonthLabel,
  formatMonthName,
  groupAmountDisplay,
  parseAmountInput,
  plural,
} from './format'

describe('formatMoney', () => {
  it('formato de lectura: símbolo pegado y sin decimales cuando no los hay', () => {
    expect(formatMoney('350000')).toBe('$350.000')
    expect(formatMoney('1250000')).toBe('$1.250.000')
    expect(formatMoney('18450000')).toBe('$18.450.000')
    expect(formatMoney('0')).toBe('$0')
  })

  it('no pierde precisión: si hay centavos, los muestra', () => {
    expect(formatMoney('350000.50')).toBe('$350.000,50')
    expect(formatMoney('350000.05')).toBe('$350.000,05')
    expect(formatMoney('350000.00')).toBe('$350.000')
  })

  it('el signo va antes del símbolo', () => {
    expect(formatMoney('-350000')).toBe('-$350.000')
    expect(formatMoney('-350000.50')).toBe('-$350.000,50')
  })

  it('COP usa $; cualquier otra moneda se prefija con su código ISO', () => {
    expect(formatMoney('350000', 'COP')).toBe('$350.000')
    expect(formatMoney('1200', 'USD')).toBe('USD 1.200')
    expect(formatMoney('1200', 'EUR')).toBe('EUR 1.200')
  })

  it('acepta número además de string, y vacío → guion', () => {
    expect(formatMoney(350000)).toBe('$350.000')
    expect(formatMoney('')).toBe('—')
    expect(formatMoney(null)).toBe('—')
    expect(formatMoney(undefined)).toBe('—')
  })

  it('devuelve el crudo si no es un número', () => {
    expect(formatMoney('n/d')).toBe('n/d')
  })
})

describe('formatAmount', () => {
  it('precisión contable: siempre dos decimales', () => {
    expect(formatAmount('350000')).toBe('$350.000,00')
    expect(formatAmount('350000.5')).toBe('$350.000,50')
    expect(formatAmount('350000.05')).toBe('$350.000,05')
  })

  it('el signo va antes del símbolo', () => {
    expect(formatAmount('-350000')).toBe('-$350.000,00')
  })

  it('COP usa $; otra moneda se prefija con su código ISO', () => {
    expect(formatAmount('350000', 'COP')).toBe('$350.000,00')
    expect(formatAmount('1200', 'USD')).toBe('USD 1.200,00')
  })

  it('vacío → guion; crudo si no es número', () => {
    expect(formatAmount('')).toBe('—')
    expect(formatAmount(null)).toBe('—')
    expect(formatAmount('n/d')).toBe('n/d')
  })
})

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

describe('formatMonthLabel', () => {
  const today = new Date(2026, 7, 14) // ago 2026

  it('abrevia el mes, con año (2 dígitos) solo si difiere del actual', () => {
    expect(formatMonthLabel('2026-08', today)).toBe('ago')
    expect(formatMonthLabel('2026-03', today)).toBe('mar')
    expect(formatMonthLabel('2027-01', today)).toBe('ene 27')
    expect(formatMonthLabel('2025-12', today)).toBe('dic 25')
  })

  it('acepta YYYY-MM-DD y devuelve el crudo si es inválido', () => {
    expect(formatMonthLabel('2026-08-01', today)).toBe('ago')
    expect(formatMonthLabel('2026-13', today)).toBe('2026-13')
  })
})

describe('formatCompactAmount', () => {
  it('compacta miles (k) y millones (M) con coma decimal es-CO', () => {
    expect(formatCompactAmount('900000')).toBe('$900 k')
    expect(formatCompactAmount('1465775')).toBe('$1,5 M')
    expect(formatCompactAmount('12500')).toBe('$12,5 k')
    expect(formatCompactAmount('850')).toBe('$850')
  })

  it('el signo va antes del símbolo y otra moneda usa su código ISO', () => {
    expect(formatCompactAmount('-1465775')).toBe('-$1,5 M')
    expect(formatCompactAmount('900000', 'COP')).toBe('$900 k')
    expect(formatCompactAmount('900000', 'USD')).toBe('USD 900 k')
  })

  it('vacío → guion', () => {
    expect(formatCompactAmount('')).toBe('—')
    expect(formatCompactAmount(null)).toBe('—')
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

describe('plural', () => {
  it('concuerda el sustantivo con la cantidad', () => {
    expect(plural(1, 'cuenta', 'cuentas')).toBe('1 cuenta')
    expect(plural(8, 'cuenta', 'cuentas')).toBe('8 cuentas')
    expect(plural(0, 'cuenta', 'cuentas')).toBe('0 cuentas')
  })

  it('sirve para frases enteras, no solo para sustantivos sueltos', () => {
    expect(plural(1, 'cuenta vencida', 'cuentas vencidas')).toBe('1 cuenta vencida')
    expect(plural(3, 'cuenta vencida', 'cuentas vencidas')).toBe('3 cuentas vencidas')
  })
})

it('formatMonthName nombra el mes para leerlo en una frase', () => {
  // `formatMonthLabel` abrevia porque nació para los ejes de una gráfica: en
  // «Consumo de ago» esa abreviatura se lee como un error de la aplicación.
  expect(formatMonthName('2026-08')).toBe('agosto de 2026')
  expect(formatMonthName('2026-01')).toBe('enero de 2026')
  // En UTC: el período viene resuelto en la zona de la organización y aquí solo
  // se nombra; construirlo en la del navegador lo correría un mes.
  expect(formatMonthName('2026-12')).toBe('diciembre de 2026')
  expect(formatMonthName('vacío')).toBe('vacío')
})
