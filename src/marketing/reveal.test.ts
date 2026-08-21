import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

/*
  Este test es una comprobación de TEXTO sobre `index.css`, y se admite que es tosca: en
  jsdom no hay cascada que consultar. Existe porque el fallo que previene es de los que no
  se ven en ningún test de componente y sí en la cara del visitante.

  Qué pasó: `useReveal` pone `data-revelado` en el elemento que OBSERVA, y en la mitad de
  las secciones lo que se revela son sus HIJOS, que llevan `data-revelar`. Con la regla
  escrita solo como `[data-revelar][data-revelado]` —los dos atributos en el mismo
  elemento— seis secciones se quedaban en opacidad 0: presentes en el DOM, medibles por los
  tests, y **invisibles** en pantalla.
*/
const css = readFileSync('src/index.css', 'utf8')

test('lo revelado se ve tanto si observa el propio elemento como si observa su contenedor', () => {
  expect(css).toContain('[data-revelado][data-revelar]')
  expect(css).toContain('[data-revelado] [data-revelar]')
})

/*
  Y la otra mitad del mismo peligro: `[data-revelar]` arranca en opacidad 0, así que
  «quitar la animación» sin más dejaría la portada en blanco para quien pide menos
  movimiento. Sin movimiento se muestra todo, quieto.
*/
test('sin movimiento el contenido se muestra, no se queda escondido', () => {
  const bloque = /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/g
  const reducido = [...css.matchAll(bloque)].map((m) => m[1]).join('\n')

  expect(reducido).toContain('[data-revelar]')
  const regla = reducido.slice(reducido.indexOf('[data-revelar]'))
  expect(regla).toMatch(/opacity:\s*1/)
})
