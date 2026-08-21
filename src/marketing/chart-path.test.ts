import { expect, test } from 'vitest'
import { trazar } from './chart-path'

test('el camino empieza en el primer punto y tiene una curva por tramo', () => {
  const { linea } = trazar([10, 20, 15, 30], 300, 100)
  expect(linea.startsWith('M 0.0')).toBe(true)
  expect(linea.match(/C /g)).toHaveLength(3)
})

test('el área cierra contra la base para poder rellenarse', () => {
  const { area } = trazar([10, 20], 200, 100)
  expect(area.endsWith('L 200 100 L 0 100 Z')).toBe(true)
})

/*
  El largo alimenta `stroke-dasharray`. Quedarse corto deja un trozo de línea ya pintado
  antes de que empiece la animación, así que se estima por encima a propósito.
*/
test('el largo estimado supera la distancia en línea recta', () => {
  const { largo } = trazar([0, 100], 300, 100)
  expect(largo).toBeGreaterThan(300)
})

test('una serie plana no se sale del lienzo', () => {
  const alto = 100
  const { linea } = trazar([5, 5, 5], 200, alto)
  /* Los pares son `x y`: la coordenada vertical es siempre la segunda. */
  const ys = [...linea.matchAll(/(\d+\.\d) (\d+\.\d)/g)].map((m) => Number(m[2]))
  expect(ys.length).toBeGreaterThan(0)
  expect(Math.max(...ys)).toBeLessThanOrEqual(alto)
  expect(Math.min(...ys)).toBeGreaterThanOrEqual(0)
})
