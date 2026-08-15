import { test, expect } from '@playwright/test'

/**
 * Smoke E2E del flujo maestro (read-only sobre el seed):
 * login → el dashboard "cuadra" con la cartera/pagos/mora/transferencia sembrados
 * → navegación por las áreas de negocio. No muta datos.
 */

test('el dashboard cuadra con el seed', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible()
  // KPIs de cartera vencida (suma de las 3 mensualidades de María con mora).
  await expect(page.getByText('Cartera vencida')).toBeVisible()
  await expect(page.getByText('COP 1.465.775,00').first()).toBeVisible()
  // Top deudores + gráficas + movimientos.
  await expect(page.getByText('María Gómez').first()).toBeVisible()
  await expect(page.getByText('Ingresos por concepto')).toBeVisible()
  await expect(page.getByText('Movimientos recientes')).toBeVisible()
})

test('contactos muestra el seed', async ({ page }) => {
  await page.goto('/contactos')
  await expect(page.getByRole('heading', { name: 'Contactos' })).toBeVisible()
  await expect(page.getByText('María Gómez').first()).toBeVisible()
})

test('cartera: cuentas por cobrar vencidas', async ({ page }) => {
  await page.goto('/cartera/cxc')
  await expect(page.getByRole('heading', { name: 'Cuentas por cobrar' })).toBeVisible()
  // La fila de la tabla (no la opción del filtro, que está oculta).
  await expect(page.locator('table').getByText('Vencida').first()).toBeVisible()
})

test('caja: saldos y transferencia demo', async ({ page }) => {
  await page.goto('/caja/cuentas')
  await expect(page.getByRole('heading', { name: 'Caja' })).toBeVisible()
  await expect(page.getByText('Banco Principal')).toBeVisible()
  await expect(page.getByText('Transferir')).toBeVisible()
})

test('gastos: cuentas por pagar', async ({ page }) => {
  await page.goto('/gastos/cxp')
  await expect(page.getByRole('heading', { name: 'Cuentas por pagar' })).toBeVisible()
  await expect(page.getByText('Arrendador Demo')).toBeVisible()
})
