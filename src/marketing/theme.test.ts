import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { tokensDe } from '@/lib/palette/css-tokens'
import { TEMA_PORTADA } from './theme'

/**
 * El color de la barra del navegador, declarado en **tres** sitios que tienen que decir lo
 * mismo: `--background` de `index.css`, los `<meta name="theme-color">` de `index.html` y
 * `TEMA_PORTADA`, que es el que aplica en caliente cuando alguien cambia de tema.
 *
 * Este test existe porque el comentario de `theme.ts` afirmaba que la compuerta de
 * `tokens.test.ts` lo vigilaba, y no era verdad: ahí solo se mide contraste. Nada
 * comparaba los tres, y `index.html` se quedó con `#f4f1e9` / `#0e1712` —la paleta
 * «bosque», borrada al elegir el azul— pintando la barra del móvil en crema sobre una
 * página azul hasta que React llegaba a corregirlo.
 *
 * `index.html` se lee del disco porque es el que pinta antes de que corra nada; los tokens
 * del CSS los sirve `tokensDe`, que documenta ahí por qué esa hoja también se lee en vez
 * de importarse.
 */

const html = readFileSync('index.html', 'utf8')

/** El `--background` del bloque pedido, sin comentarios de por medio. */
function fondoDe(selector: string): string {
  const valor = tokensDe(selector)['--background']
  if (!valor) throw new Error(`\`${selector}\` no declara --background`)
  return valor
}

/** El `content` del `<meta name="theme-color">` de ese esquema. */
function metaDe(esquema: 'light' | 'dark'): string {
  const meta = new RegExp(
    `<meta name="theme-color" media="\\(prefers-color-scheme: ${esquema}\\)" content="([^"]+)" />`,
  ).exec(html)
  if (!meta) throw new Error(`index.html no trae un theme-color para \`${esquema}\``)
  return meta[1]
}

test.each(['light', 'dark'] as const)('el theme-color de %s es el fondo de la página', (esquema) => {
  const fondo = fondoDe(esquema === 'light' ? ':root' : '\\.dark')

  // El estático, que es el que pinta antes de que corra nada.
  expect(metaDe(esquema)).toBe(fondo)
  // Y el de runtime, que gana cuando alguien fuerza un tema desde el conmutador.
  expect(TEMA_PORTADA[esquema]).toBe(fondo)
})
