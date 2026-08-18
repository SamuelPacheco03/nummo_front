import { test as setup, expect } from '@playwright/test'

const authFile = 'e2e/.auth/state.json'

/**
 * Login una sola vez; el resto reusa esta sesión (sin re-loguear → sin
 * rate-limit).
 *
 * **Se espera al saludo del panel, no a un título fijo.** Antes esperaba un
 * encabezado «Panel» que dejó de existir cuando el tablero pasó a saludar por el
 * nombre, y con eso el `setup` fallaba: la suite entera no llegaba ni a
 * autenticarse. Lo estable es que el shell esté montado — la barra lateral y su
 * enlace al panel—, no la palabra que hoy toque en el `<h1>`.
 */
setup('authenticate', async ({ page }) => {
  await page.goto('/login')
  await page.locator('#email').fill('demo@nummo.app')
  await page.locator('#password').fill('Demo1234!')
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page.getByRole('link', { name: 'Panel' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.context().storageState({ path: authFile })
})
