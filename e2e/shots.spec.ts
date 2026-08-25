import { test, expect } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { mockApi } from './mock-api'

/**
 * **Capturas de una pantalla, para poder mirarla.**
 *
 * No afirma nada: es un espejo. Su única aserción es que la pantalla llegó a
 * pintarse — una captura en blanco no sirve de nada y hay que enterarse.
 *
 * ```bash
 * RUTA=/app/config/cobranza pnpm shots
 * RUTA=/app/config/cobranza ANCHOS=390,768 pnpm shots
 * RUTA=/app/config/cobranza TEMA=dark pnpm shots
 * ```
 *
 * Sale en `.shots/`, que no se versiona.
 */

const RUTA = process.env.RUTA ?? '/app/config/cobranza'
const ANCHOS = (process.env.ANCHOS ?? '390,768,1280,1440').split(',').map(Number)
const TEMA = process.env.TEMA ?? 'light'
const SALIDA = '.shots'

const nombre = RUTA.replace(/^\/app\/?/, '').replace(/\//g, '-') || 'inicio'

test.describe.configure({ mode: 'serial' })

for (const ancho of ANCHOS) {
  test(`${RUTA} @ ${ancho}px`, async ({ page }) => {
    mkdirSync(SALIDA, { recursive: true })
    await mockApi(page)

    /*
      El tema por defecto es «el del sistema», así que se pide al navegador en vez
      de escribir en `localStorage`: la clave del store es un detalle interno y
      fingirla se rompe en silencio —la primera versión de esto sacó capturas en
      claro creyendo que eran oscuras—.
    */
    await page.emulateMedia({ colorScheme: TEMA as 'light' | 'dark' })

    await page.setViewportSize({ width: ancho, height: 1000 })
    await page.goto(RUTA, { waitUntil: 'networkidle' })

    /*
      Que el `<h1>` esté es lo que separa «la pantalla se pintó» de «salió el
      esqueleto y la captura no dice nada». Sin esto, un fallo de datos se
      entrega como una imagen gris.
    */
    await expect(page.locator('h1')).toBeVisible({ timeout: 10_000 })
    // Las fuentes variables llegan después del primer pintado.
    await page.evaluate(() => document.fonts.ready)

    await page.screenshot({ path: `${SALIDA}/${nombre}-${TEMA}-${ancho}.png`, fullPage: true })
  })
}
