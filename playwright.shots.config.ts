import { defineConfig, devices } from '@playwright/test'
import { existsSync, readdirSync } from 'node:fs'

/**
 * El Chromium del contenedor, si es que hay uno.
 *
 * En un contenedor de desarrollo remoto viene Chromium preinstalado y **no tiene
 * por qué ser el build que pide la versión de Playwright del repo**; descargar
 * otro está bloqueado. En una máquina normal esto no encuentra nada y Playwright
 * usa el suyo, como siempre.
 */
function chromiumDelSistema(): string | undefined {
  if (process.env.CHROMIUM) return process.env.CHROMIUM
  const raiz = '/opt/pw-browsers'
  if (!existsSync(raiz)) return undefined
  const build = readdirSync(raiz).find((d) => /^chromium-\d+$/.test(d))
  const binario = build && `${raiz}/${build}/chrome-linux/chrome`
  return binario && existsSync(binario) ? binario : undefined
}

/**
 * Capturas contra el frontend **con el API doblada** (`e2e/mock-api.ts`).
 *
 * Config aparte de `playwright.config.ts` a propósito: aquella exige `nummo-api`
 * en el 4010 y hace login de verdad, y ese es justo el requisito que aquí no se
 * puede cumplir. Sin dependencia de `setup`, sin sesión guardada, sin backend.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: /shots\.spec\.ts/,
  timeout: 60_000,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    ...devices['Desktop Chrome'],
    launchOptions: { executablePath: chromiumDelSistema() },
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
