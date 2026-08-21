/**
 * `@types/node` NO entra en `tsconfig.app.json` a propósito: el código de la app no
 * tiene por qué ver el sistema de ficheros.
 *
 * `tokens.test.ts` sí necesita leer `index.css` para comparar la capa contra lo que la
 * consola declara de verdad, y no puede hacerlo importándolo: Vitest corre con
 * `css: false` y deja en blanco cualquier import que resuelva a un `.css`, también con
 * `?raw` y `?inline` (comprobado). Así que se declara exactamente lo que ese test usa,
 * y nada más — abrir los tipos de Node enteros dejaría `process` y `Buffer` al alcance
 * de cualquier archivo de `src/`.
 */
declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf8'): string
}
