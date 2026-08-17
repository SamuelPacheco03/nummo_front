import { expect, test } from 'vitest'
import { asArray } from './list-result'

test('deja pasar la lista cuando llega una lista', () => {
  expect(asArray<number>([1, 2])).toEqual([1, 2])
})

test('devuelve vacío ante cualquier cosa que no sea una lista', () => {
  // El caso real que lo motivó: un error servido como 200 con la forma de un
  // listado paginado, donde el cuerpo debía ser un array plano.
  expect(asArray({ data: [], meta: {} })).toEqual([])
  for (const value of [undefined, null, 'texto', 42, {}]) {
    expect(asArray(value)).toEqual([])
  }
})
