import { expect, test } from 'vitest'
import {
  cacheShare,
  formatCost,
  formatMs,
  formatTokens,
  phaseSlices,
  totalTokens,
  SIN_DATO,
  SIN_PRECIO,
} from './metrics'
import type { PlaygroundTokenUsage } from '@/api/generated/model'

function usage(over: Partial<PlaygroundTokenUsage> = {}): PlaygroundTokenUsage {
  return {
    input: null,
    output: null,
    cacheRead: null,
    cacheWrite: null,
    noCache: null,
    reasoning: null,
    ...over,
  }
}

test('un token que el proveedor no reportó se pinta «—», nunca cero', () => {
  // Un cero ahí inventa un ahorro de caché que no ocurrió.
  expect(formatTokens(null)).toBe(SIN_DATO)
  expect(formatTokens(undefined)).toBe(SIN_DATO)
  expect(formatTokens(0)).toBe('0')
  expect(formatTokens(12500)).toBe('12.500')
})

test('los tokens del turno son desconocidos solo si no se sabe ninguno', () => {
  expect(totalTokens(usage())).toBeNull()
  expect(totalTokens(usage({ input: 1200 }))).toBe(1200)
  expect(totalTokens(usage({ input: 1200, output: 300 }))).toBe(1500)
})

test('el ahorro de caché necesita las dos cifras', () => {
  expect(cacheShare(usage({ input: 1000 }))).toBeNull()
  expect(cacheShare(usage({ cacheRead: 800 }))).toBeNull()
  expect(cacheShare(usage({ input: 0, cacheRead: 0 }))).toBeNull()
  expect(cacheShare(usage({ input: 1000, cacheRead: 800 }))).toBe(80)
})

test('el coste son micro-dólares, y sin precio no es gratis', () => {
  expect(formatCost(3200)).toBe('USD 0,0032')
  expect(formatCost(1_250_000)).toBe('USD 1,2500')
  expect(formatCost(null)).toBe(SIN_PRECIO)
  // Un turno que de verdad costó cero se dice, y es distinto de no tener precio.
  expect(formatCost(0)).toBe('USD 0,0000')
})

test('los tiempos se leen en ms por debajo del segundo y en s por encima', () => {
  expect(formatMs(820)).toBe('820 ms')
  expect(formatMs(1500)).toBe('1,5 s')
  expect(formatMs(12_400)).toBe('12,4 s')
  expect(formatMs(null)).toBe(SIN_DATO)
})

test('las herramientas no se cuentan dos veces: salen de dentro del motor', () => {
  const slices = phaseSlices({
    totalMs: 1000,
    resolveMs: 50,
    contextMs: 100,
    engineMs: 800,
    toolsMs: 600,
    persistMs: 50,
  })

  const byKey = Object.fromEntries(slices.map((s) => [s.key, s.ms]))
  expect(byKey.engine).toBe(200)
  expect(byKey.tools).toBe(600)
  expect(slices.reduce((sum, s) => sum + s.ms, 0)).toBe(1000)
  expect(Math.round(slices.reduce((sum, s) => sum + s.pct, 0))).toBe(100)
})

test('lo que el backend no desglosa se llama «resto», no se reparte', () => {
  const slices = phaseSlices({
    totalMs: 1000,
    resolveMs: 10,
    contextMs: 10,
    engineMs: 400,
    toolsMs: 0,
    persistMs: 10,
  })

  expect(slices.find((s) => s.key === 'rest')?.ms).toBe(570)
})

test('un turno sin tiempos no dibuja una barra vacía', () => {
  expect(
    phaseSlices({ totalMs: 0, resolveMs: 0, contextMs: 0, engineMs: 0, toolsMs: 0, persistMs: 0 }),
  ).toEqual([])
})
