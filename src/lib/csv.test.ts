import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'

describe('toCsv', () => {
  it('genera filas separadas por CRLF', () => {
    expect(toCsv(['A', 'B'], [['1', '2'], ['3', '4']])).toBe('A,B\r\n1,2\r\n3,4')
  })

  it('entrecomilla y escapa comas, comillas y saltos de línea', () => {
    expect(
      toCsv(
        ['Nombre', 'Monto'],
        [
          ['Gómez, María', '1000'],
          ['Dice "hola"', '2,50'],
        ],
      ),
    ).toBe('Nombre,Monto\r\n"Gómez, María",1000\r\n"Dice ""hola""","2,50"')
  })

  it('acepta números', () => {
    expect(toCsv(['n'], [[42]])).toBe('n\r\n42')
  })
})
