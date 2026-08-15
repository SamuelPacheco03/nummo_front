import { test as setup, expect } from '@playwright/test'

const authFile = 'e2e/.auth/state.json'

// Login una sola vez; el resto de tests reusan esta sesión (sin re-loguear → sin rate-limit).
setup('authenticate', async ({ page }) => {
  await page.goto('/login')
  await page.locator('#email').fill('demo@nummo.app')
  await page.locator('#password').fill('Demo1234!')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible()
  await page.context().storageState({ path: authFile })
})
