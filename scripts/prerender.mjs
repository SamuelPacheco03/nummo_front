/**
 * Mete la portada ya renderizada dentro de `dist/index.html`.
 *
 * Corre DESPUÉS de `vite build` y de un build SSR aparte (`vite build --ssr`), porque el
 * código de la portada es TSX con alias `@/` y Node no lo entiende sin pasar por Vite.
 *
 * Se hace con `renderToString` y no con un navegador sin cabeza a propósito: un navegador
 * daría el mismo resultado, pero ataría `pnpm build` a tener Chromium instalado — y un
 * build que necesita un navegador es un build que se rompe en el primer contenedor que no
 * lo trae.
 */
import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const HTML = resolve('dist/index.html')
const BUNDLE = resolve('dist-ssr/prerender.js')
const HUECO = '<div id="portada"></div>'

if (!existsSync(BUNDLE)) {
  console.error(`prerender: no encuentro ${BUNDLE}. ¿Corrió el build SSR?`)
  process.exit(1)
}

const { renderizarPortada } = await import(BUNDLE)
const cuerpo = renderizarPortada()

if (!cuerpo || cuerpo.length < 500) {
  console.error(`prerender: el render salió vacío o demasiado corto (${cuerpo?.length ?? 0} chars).`)
  process.exit(1)
}

const html = readFileSync(HTML, 'utf8')
if (!html.includes(HUECO)) {
  console.error(`prerender: no encuentro \`${HUECO}\` en dist/index.html.`)
  process.exit(1)
}

writeFileSync(HTML, html.replace(HUECO, `<div id="portada">${cuerpo}</div>`))
/* El bundle SSR es un intermedio: no tiene por qué acabar en lo que se publica. */
rmSync(resolve('dist-ssr'), { recursive: true, force: true })

console.log(`prerender: portada incrustada (${(cuerpo.length / 1024).toFixed(1)} kB de HTML).`)
