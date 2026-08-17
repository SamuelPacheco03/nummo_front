import { describe, expect, it } from 'vitest'
import {
  hasAnyFilter,
  readFromParams,
  readStored,
  resolveInitial,
  writeToParams,
} from './list-filters'

const KEYS = ['estado', 'pagador', 'pagina'] as const

describe('readFromParams', () => {
  it('toma solo las claves de esta lista', () => {
    const params = new URLSearchParams('estado=OVERDUE&utm_source=correo&nueva=1')

    expect(readFromParams(params, KEYS)).toEqual({ estado: 'OVERDUE' })
  })

  it('ignora los valores vacíos', () => {
    expect(readFromParams(new URLSearchParams('estado=&pagador=abc'), KEYS)).toEqual({
      pagador: 'abc',
    })
  })
})

describe('writeToParams', () => {
  it('borra las claves vacías en vez de escribirlas', () => {
    const params = new URLSearchParams('estado=OVERDUE&pagador=abc')
    const next = writeToParams(params, { estado: '', pagador: 'abc' }, KEYS)

    expect(next.has('estado')).toBe(false)
    expect(next.get('pagador')).toBe('abc')
  })

  it('respeta parámetros ajenos a la lista', () => {
    const params = new URLSearchParams('utm_source=correo')
    const next = writeToParams(params, { estado: 'PAID' }, KEYS)

    expect(next.get('utm_source')).toBe('correo')
    expect(next.get('estado')).toBe('PAID')
  })
})

describe('readStored', () => {
  it('recupera lo guardado, quedándose con las claves conocidas', () => {
    const raw = JSON.stringify({ estado: 'OVERDUE', obsoleto: 'x', pagina: '' })

    expect(readStored(raw, KEYS)).toEqual({ estado: 'OVERDUE' })
  })

  it('no se cae con JSON corrupto ni con formas raras', () => {
    // sessionStorage sobrevive a despliegues: puede traer basura de otra versión.
    expect(readStored('{no es json', KEYS)).toEqual({})
    expect(readStored('null', KEYS)).toEqual({})
    expect(readStored('"texto"', KEYS)).toEqual({})
    expect(readStored(JSON.stringify({ estado: 42 }), KEYS)).toEqual({})
    expect(readStored(null, KEYS)).toEqual({})
  })
})

describe('resolveInitial', () => {
  it('la URL manda si dice algo', () => {
    const out = resolveInitial({ estado: 'PAID' }, { estado: 'OVERDUE', pagador: 'abc' })

    expect(out.values).toEqual({ estado: 'PAID' })
    expect(out.restored).toBe(false)
  })

  it('sin nada en la URL, recupera la sesión y pide escribirla', () => {
    const out = resolveInitial({}, { estado: 'OVERDUE' })

    expect(out.values).toEqual({ estado: 'OVERDUE' })
    // `restored` es lo que dispara el reemplazo de la URL: si no, lo que se ve y
    // lo que dice la barra de direcciones contarían cosas distintas.
    expect(out.restored).toBe(true)
  })

  it('sin URL y sin sesión, no filtra nada', () => {
    expect(resolveInitial({}, {})).toEqual({ values: {}, restored: false })
  })
})

describe('hasAnyFilter', () => {
  it('un valor vacío no cuenta como filtro', () => {
    expect(hasAnyFilter({})).toBe(false)
    expect(hasAnyFilter({ estado: '' })).toBe(false)
    expect(hasAnyFilter({ estado: 'PAID' })).toBe(true)
  })
})
