import { describe, expect, it } from 'vitest'
import { splitQuote, trimQuote, withQuote } from './quote'

describe('armar la cita', () => {
  it('la pone arriba, con quién lo dijo', () => {
    /*
      El autor no es decoración: viaja para que **Numi lo lea**. Sin él no sabe si se le
      está citando a él o al propio usuario, que es justo lo que la pregunta suele estar
      distinguiendo.
    */
    expect(withQuote({ author: 'Numi', quote: 'Ana debe $120.000' }, '¿de dónde sale?')).toBe(
      '> Numi: Ana debe $120.000\n\n¿de dónde sale?',
    )
  })

  it('recorta a lo que cabe en un bloque de dos líneas', () => {
    const largo = 'palabra '.repeat(40)
    const cita = trimQuote(largo)
    expect(cita.length).toBeLessThanOrEqual(160)
    expect(cita.endsWith('…')).toBe(true)
  })

  it('aplana los saltos: una cita es una referencia, no el mensaje entero', () => {
    expect(trimQuote('primera\n\n  segunda  ')).toBe('primera segunda')
  })
})

describe('volver a partirla', () => {
  it('devuelve el autor, lo citado y lo escrito debajo', () => {
    expect(splitQuote('> Numi: Ana debe $120.000\n\n¿de dónde sale?')).toEqual({
      author: 'Numi',
      quote: 'Ana debe $120.000',
      text: '¿de dónde sale?',
    })
  })

  it('reconoce también lo que se citó de uno mismo', () => {
    expect(splitQuote('> Tú: registra el pago de Ana\n\n¿quedó?')?.author).toBe('Tú')
  })

  it('un mensaje normal no lleva cita', () => {
    expect(splitQuote('cuánto me debe Ana')).toBeNull()
  })

  it('un «>» a mano no es una cita de esta aplicación', () => {
    /*
      Se exige el autor y no solo el `>`. Alguien puede empezar un mensaje con «> » porque
      sí, y pintarlo como cita sería inventarle un origen que no tiene.
    */
    expect(splitQuote('> esto lo escribí yo con un mayor que')).toBeNull()
  })

  it('lo de después se conserva entero, con sus saltos', () => {
    const partido = splitQuote('> Tú: algo\n\nprimera línea\nsegunda línea')
    expect(partido?.text).toBe('primera línea\nsegunda línea')
  })
})
