import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

/*
  Lo que este test evita es un fallo que **no se ve en desarrollo**: una instalación local
  trae las devDependencies, así que importar una desde código de producción funciona en tu
  máquina y revienta en el primer despliegue que instale con `--prod`.

  Pasó de verdad: las fuentes de la portada entraron como devDependencies cuando solo las
  usaba el laboratorio, y siguieron ahí cuando la portada empezó a importarlas.
*/

const paquete = JSON.parse(readFileSync('package.json', 'utf8')) as {
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
}

/** Los import de paquete de un archivo, sin los relativos ni los del alias `@/`. */
function paquetesImportadosEn(archivo: string): string[] {
  const fuente = readFileSync(archivo, 'utf8')
  return [...fuente.matchAll(/^import\s+(?:.*?\s+from\s+)?'([^'.@/][^']*|@[^/']+\/[^']+)'/gm)]
    .map((m) => m[1])
    .filter((especificador) => !especificador.startsWith('@/'))
    .map((especificador) => {
      const partes = especificador.split('/')
      return especificador.startsWith('@') ? `${partes[0]}/${partes[1]}` : partes[0]
    })
}

/* Los archivos que SÍ acaban en el bundle de producción de la portada. */
const DE_PRODUCCION = [
  'src/marketing/landing-page.tsx',
  'src/marketing/main.tsx',
  'src/marketing/hero.tsx',
  'src/marketing/pricing-section.tsx',
  'src/marketing/numi-section.tsx',
]

test('la portada no importa nada que esté solo en devDependencies', () => {
  const enDev: string[] = []

  for (const archivo of DE_PRODUCCION) {
    for (const nombre of paquetesImportadosEn(archivo)) {
      const esDev = nombre in paquete.devDependencies
      const esProd = nombre in paquete.dependencies
      if (esDev && !esProd) enDev.push(`${archivo} → ${nombre}`)
    }
  }

  expect(enDev).toEqual([])
})

/*
  Y el otro lado: la itálica de la serif es un archivo aparte del paquete. `index.css` solo
  trae la redonda, así que un import «simplificado» a la raíz dejaría el destacado del
  titular en redonda sin que fallara nada — el peor tipo de regresión, silenciosa.
*/
test('la portada importa la itálica de la serif, que va en su propio archivo', () => {
  const fuente = readFileSync('src/marketing/landing-page.tsx', 'utf8')
  expect(fuente).toContain('@fontsource/instrument-serif/400-italic.css')
})
