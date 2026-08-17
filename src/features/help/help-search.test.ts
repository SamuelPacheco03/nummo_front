import { expect, test } from 'vitest'
import { TOPICS } from './topics'
import { searchGuide } from './help-search'

test('encuentra un término del glosario y lo enlaza a su tema', () => {
  const hits = searchGuide('mora')
  expect(hits.length).toBeGreaterThan(0)
  expect(hits.some((h) => h.to === '/ayuda/cobrar')).toBe(true)
})

test('ignora tildes y mayúsculas', () => {
  expect(searchGuide('MATRICULA')).toEqual(searchGuide('matrícula'))
  expect(searchGuide('organizacion').length).toBeGreaterThan(0)
})

test('no responde a una sola letra', () => {
  expect(searchGuide('a')).toEqual([])
  expect(searchGuide(' ')).toEqual([])
})

test('todo destino apunta a un tema que existe', () => {
  const slugs = new Set(TOPICS.map((t) => t.slug))
  for (const query of ['pago', 'cuenta', 'rol', 'saldo', 'informe']) {
    for (const hit of searchGuide(query)) {
      expect(slugs.has(hit.to.replace('/ayuda/', ''))).toBe(true)
    }
  }
})
