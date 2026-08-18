import { test, expect } from '@playwright/test'

/**
 * Smoke de lectura: cada área de negocio abre, con su encabezado y su contenido.
 * No muta nada — el ciclo del dinero vive en `flujo-maestro.spec.ts`.
 *
 * **Afirma sobre lo que la pantalla promete, no sobre el seed.** La versión
 * anterior comprobaba «Cartera vencida», «Top deudores», «Movimientos
 * recientes» y «Banco Principal»: nombres de secciones que el rediseño cambió y
 * de datos concretos de la siembra. Un E2E que se rompe cuando se renombra una
 * tarjeta o se resiembra la base deja de correrse, y uno que no se corre no
 * protege nada.
 */

test('el panel carga y muestra sus cifras', async ({ page }) => {
  await page.goto('/')
  // Saluda por el nombre, así que lo estable es que haya un <h1> y las cifras.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText('Saldo disponible')).toBeVisible()
  await expect(page.getByText('Por cobrar').first()).toBeVisible()
  await expect(page.getByText('Flujo · últimos 6 meses')).toBeVisible()
  // Si el backend falló, el panel lo dice en vez de pintar ceros (§45.2b).
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('contactos', async ({ page }) => {
  await page.goto('/contactos')
  await expect(page.getByRole('heading', { name: 'Contactos' })).toBeVisible()
  await expect(page.getByPlaceholder(/buscar/i)).toBeVisible()
})

test('las dos caras de la cartera', async ({ page }) => {
  await page.goto('/cartera/cxc')
  await expect(page.getByRole('heading', { name: 'Cuentas por cobrar' })).toBeVisible()
  await expect(page.getByPlaceholder(/pagador/i)).toBeVisible()

  await page.goto('/gastos/cxp')
  await expect(page.getByRole('heading', { name: 'Cuentas por pagar' })).toBeVisible()
  await expect(page.getByPlaceholder(/proveedor/i)).toBeVisible()
})

test('pagos y egresos', async ({ page }) => {
  await page.goto('/cartera/pagos')
  await expect(page.getByRole('heading', { name: 'Pagos' })).toBeVisible()

  await page.goto('/gastos/egresos')
  await expect(page.getByRole('heading', { name: 'Egresos' })).toBeVisible()
})

test('caja: saldos y la puerta de la transferencia', async ({ page }) => {
  await page.goto('/caja/cuentas')
  await expect(page.getByRole('heading', { name: 'Caja' })).toBeVisible()
  await expect(page.getByRole('button', { name: /transferir/i })).toBeVisible()
})

test('resultados', async ({ page }) => {
  await page.goto('/informes/resultados')
  await expect(page.getByRole('heading', { name: 'Resultados' })).toBeVisible()
  await expect(page.getByText('Neto del período')).toBeVisible()
})

test('configuración y ayuda abren su navegación', async ({ page }) => {
  await page.goto('/config/empresa')
  await expect(page.getByRole('heading', { name: 'Empresa' })).toBeVisible()

  await page.goto('/ayuda')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})
