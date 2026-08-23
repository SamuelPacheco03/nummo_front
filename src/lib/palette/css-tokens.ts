import { readFileSync } from 'node:fs'

/*
  La hoja de estilos de verdad, leída del disco: Vitest corre con `css: false` y deja en
  blanco cualquier import que resuelva a un `.css`, también con `?raw` y `?inline`. La ruta
  es relativa a la raíz del proyecto, que es desde donde Vitest arranca. El porqué de la
  declaración de tipos está en `node-shims.d.ts`.

  Los saltos se normalizan al leer, y no es cosmético: con `core.autocrlf` el archivo llega
  al disco de Windows con CRLF —el repositorio lo guarda con LF—, y entonces el `\{\n` del
  patrón de abajo no casa con `\{\r\n`. Los dos tests que miran esta hoja se caían con «No
  encontré el bloque `:root`», que se lee como si la paleta se hubiera quedado sin tokens
  cuando lo único que pasaba era el sistema operativo.
*/
const css = readFileSync('src/index.css', 'utf8').replace(/\r\n/g, '\n')

/**
 * Los `--token: valor` de un bloque de `index.css`, sin comentarios.
 *
 * Vive fuera de los tests porque son dos los que preguntan lo mismo: `tokens.test.ts` mide
 * el contraste de los pares y `marketing/theme.test.ts` compara `--background` con el
 * `theme-color` de la portada. Cuando el patrón era una copia en cada uno, el fallo de CRLF
 * también fue doble.
 */
export function tokensDe(selector: string): Record<string, string> {
  const bloque = new RegExp(`^${selector} \\{\\n([\\s\\S]*?)^\\}`, 'm').exec(css)
  if (!bloque) throw new Error(`No encontré el bloque \`${selector}\` en index.css`)
  const cuerpo = bloque[1].replace(/\/\*[\s\S]*?\*\//g, '')
  const salida: Record<string, string> = {}
  for (const [, nombre, valor] of cuerpo.matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)) {
    salida[nombre] = valor.trim()
  }
  return salida
}
