import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { derive } from './tokens'
import { PALETTES, paletteById, type PaletteMode } from './palettes'

/**
 * Estos tests defienden lo único que puede romper la capa de paletas sin que se note:
 * que emita **menos** tokens de los que declara `index.css`. Un token que falta no
 * falla, cae al valor de la app — y la muestra enseña una mezcla de dos paletas
 * mientras alguien decide mirándola.
 */

/*
  Se lee del disco, no se importa: Vitest corre con `css: false` y deja en blanco los
  imports que resuelven a un `.css` (también con `?raw`). La ruta es relativa a la raíz
  del proyecto, que es desde donde Vitest arranca. El porqué de la declaración de tipos
  está en `node-shims.d.ts`.
*/
const css = readFileSync('src/index.css', 'utf8')

/** Saca los `--token: valor` de un bloque de `index.css`, sin comentarios. */
function declaredIn(selector: string): Map<string, string> {
  const block = new RegExp(`^${selector} \\{\\n([\\s\\S]*?)^\\}`, 'm').exec(css)
  if (!block) throw new Error(`No encontré el bloque \`${selector}\` en index.css`)
  const body = block[1].replace(/\/\*[\s\S]*?\*\//g, '')
  const out = new Map<string, string>()
  for (const [, name, value] of body.matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)) {
    out.set(name, value.trim())
  }
  return out
}

/*
  Lo que la capa NO emite, a propósito (documentado en `palettes.ts`):
  - `--radius` no es un color.
  - `--chart-*` conserva el orden razonado de las series y se re-derivará cuando haya
    una paleta elegida.
*/
const FUERA_DE_LA_CAPA = new Set([
  '--radius',
  '--chart-1',
  '--chart-2',
  '--chart-3',
  '--chart-4',
  '--chart-5',
])

/*
  Las divergencias conocidas entre la capa y `index.css`. Van por modo —y no en un
  comentario suelto— para que una regresión en claro no pueda esconderse detrás de una
  excepción de oscuro, y para que reaparezcan en la revisión el día que la paleta
  elegida aterrice en el CSS.

  `--input` y `--scrim` están explicadas en `tokens.ts`. Las tres de oscuro son extremos
  que el CSS matizó a mano y la capa resuelve al polo puro de la candidata: un blanco
  azulado para la burbuja, `#f8fafc` en vez de blanco sobre el azul del sidebar, y
  `#0f172a` en vez del fondo para el ámbar. Comprobado que en las tres **la capa
  contrasta más que el CSS** (11.4 vs 10.0 · 3.7 vs 3.5 · 8.7 vs 8.3): la diferencia es
  de gusto, no de accesibilidad, y matizarla por paleta es trabajo de cuando haya una
  elegida.
*/
const DIVERGENCIAS_CONOCIDAS: Record<PaletteMode, ReadonlySet<string>> = {
  light: new Set(['--input', '--scrim']),
  dark: new Set([
    '--input',
    '--scrim',
    '--chat-bubble-foreground',
    '--sidebar-primary-foreground',
    '--warning-foreground',
  ]),
}

test('la capa emite todos los tokens de color que declara :root', () => {
  const emitidos = new Set(Object.keys(derive(paletteById('azul'), 'light')))
  const faltan = [...declaredIn(':root').keys()].filter(
    (t) => !FUERA_DE_LA_CAPA.has(t) && !emitidos.has(t),
  )
  expect(faltan).toEqual([])
})

test('la capa emite todos los tokens de color que declara .dark', () => {
  const emitidos = new Set(Object.keys(derive(paletteById('azul'), 'dark')))
  const faltan = [...declaredIn('\\.dark').keys()].filter(
    (t) => !FUERA_DE_LA_CAPA.has(t) && !emitidos.has(t),
  )
  expect(faltan).toEqual([])
})

/*
  El test que justifica que `azul` exista como candidata: si las 21 ranuras reproducen
  la consola tal y como está hoy, el derivador no está inventando un sistema paralelo
  — está describiendo el que ya hay. El día que deje de cuadrar, o cambió `index.css`
  sin pasar por la capa, o la capa se desvió.
*/
test.each<PaletteMode>(['light', 'dark'])(
  'la candidata «azul» reproduce %s de index.css valor por valor',
  (mode) => {
    const derivados = derive(paletteById('azul'), mode)
    const declarados = declaredIn(mode === 'light' ? ':root' : '\\.dark')

    const diferencias: Record<string, { css: string; capa: string }> = {}
    for (const [token, valorCss] of declarados) {
      if (FUERA_DE_LA_CAPA.has(token) || DIVERGENCIAS_CONOCIDAS[mode].has(token)) continue
      const valorCapa = derivados[token]
      if (valorCapa?.toLowerCase() !== valorCss.toLowerCase()) {
        diferencias[token] = { css: valorCss, capa: valorCapa ?? '(no emitido)' }
      }
    }
    expect(diferencias).toEqual({})
  },
)

test('las tres candidatas rellenan las 21 ranuras en los dos modos', () => {
  for (const palette of PALETTES) {
    for (const mode of ['light', 'dark'] as const) {
      const slots = palette[mode]
      const vacias = Object.entries(slots)
        .filter(([, v]) => !/^#[0-9a-f]{6}$/i.test(v))
        .map(([k]) => k)
      expect(vacias, `${palette.id}/${mode}`).toEqual([])
      expect(Object.keys(slots), `${palette.id}/${mode}`).toHaveLength(21)
    }
  }
})

test('ninguna candidata deja un token sin emitir', () => {
  const referencia = Object.keys(derive(paletteById('azul'), 'light')).sort()
  for (const palette of PALETTES) {
    for (const mode of ['light', 'dark'] as const) {
      expect(Object.keys(derive(palette, mode)).sort(), `${palette.id}/${mode}`).toEqual(referencia)
    }
  }
})
