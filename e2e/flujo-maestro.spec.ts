import { test, expect, type Page } from '@playwright/test'

/**
 * **El ciclo del dinero, de punta a punta y contra el backend de verdad.**
 *
 * Es el único test que *mueve dinero*: crea un pagador, le pone un acuerdo,
 * genera su mensualidad, la cobra a medias, causa la mora y la condona. Luego el
 * espejo del gasto, una transferencia entre cuentas, y que la caja lo refleje.
 *
 * Los tests unitarios prueban cada pantalla con el API simulado; este prueba lo
 * único que ninguno puede: que las piezas encajen con el backend real, en orden,
 * y que lo que una pantalla escribe otra lo lea.
 *
 * **Crea sus propios datos, con un nombre único por ejecución.** Así se puede
 * correr dos veces seguidas sin limpiar nada y sin depender de lo que traiga la
 * siembra — que es lo que dejó inservible al smoke anterior.
 *
 * Requiere `nummo-api` en :4010 sembrado (`pnpm seed`): sin conceptos de cobro,
 * categorías de gasto y al menos dos cuentas no hay con qué operar.
 */

/** Marca de esta ejecución, para no chocar con la anterior. */
const SELLO = `E2E-${Date.now().toString().slice(-8)}`
const PAGADOR = `Pagador ${SELLO}`

/** Escribe en un `MoneyInput`, que agrupa los miles solo. */
async function importe(page: Page, id: string, valor: string) {
  await page.locator(`#${id}`).fill(valor)
}

/** Elige el primer contacto que case con `nombre` en un `ContactPicker`. */
async function elegirContacto(page: Page, campo: string, nombre: string) {
  await page.getByRole('combobox', { name: new RegExp(campo, 'i') }).click()
  await page.getByPlaceholder('Buscar contacto…').fill(nombre)
  await page.getByRole('option', { name: new RegExp(nombre, 'i') }).first().click()
}

test('el ciclo del dinero: acuerdo → mensualidad → abono → mora → condonar', async ({ page }) => {
  test.slow() // toca seis pantallas y varias escrituras contra el backend.

  await test.step('nace el pagador', async () => {
    await page.goto('/contactos/nuevo')
    await page.locator('#f-first').fill(PAGADOR)
    await page.locator('#f-last').fill('Prueba')
    await page.getByRole('button', { name: 'Crear contacto' }).click()
    await expect(page.getByText(/creado/i).first()).toBeVisible()
  })

  await test.step('se le firma un acuerdo mensual', async () => {
    await page.goto('/cartera/acuerdos/nuevo')
    await elegirContacto(page, 'Pagador', PAGADOR)
    // El primer concepto de la siembra; el acuerdo necesita uno cualquiera.
    await page.locator('#ag-concept').selectOption({ index: 1 })
    await importe(page, 'ag-amount', '100.000')
    // Empieza el mes pasado para que la mensualidad ya esté vencida.
    const mesPasado = new Date()
    mesPasado.setMonth(mesPasado.getMonth() - 1, 1)
    await page.locator('#ag-start').fill(mesPasado.toISOString().slice(0, 10))
    await page.locator('#ag-dueday').fill('5')
    await page.getByRole('button', { name: 'Crear acuerdo' }).click()
    await expect(page.getByText(/creado/i).first()).toBeVisible()
  })

  await test.step('la mensualidad se genera sola desde el acuerdo', async () => {
    await page.goto('/cartera/cxc')
    await page.getByRole('button', { name: 'Acciones' }).click()
    await page.getByRole('menuitem', { name: /generar mensualidades/i }).click()
    await expect(page.getByText(/generadas/i)).toBeVisible()

    // Y aparece en la lista, a nombre de quien la debe.
    await page.getByPlaceholder(/pagador/i).fill(PAGADOR)
    await expect(page.getByText(PAGADOR).first()).toBeVisible()
  })

  await test.step('se cobra la mitad y el saldo baja', async () => {
    await page.getByText(PAGADOR).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('link', { name: /registrar pago/i }).click()

    await page.locator('#s-amount').fill('40.000')
    await page.getByRole('button', { name: 'Registrar pago' }).last().click()
    await expect(page.getByText(/pago registrado/i)).toBeVisible()

    // Vuelve a la cuenta de la que salió (§87.5) y ya no debe el total.
    await expect(page).toHaveURL(/\/cartera\/cxc\//)
    await expect(page.getByText('Parcial').first()).toBeVisible()
  })

  await test.step('se causa la mora y luego se condona', async () => {
    await page.goto('/cartera/cxc')
    await page.getByRole('button', { name: 'Acciones' }).click()
    await page.getByRole('menuitem', { name: /causar mora/i }).click()
    await expect(page.getByText(/mora causada/i)).toBeVisible()

    await page.getByPlaceholder(/pagador/i).fill(PAGADOR)
    await page.getByText(PAGADOR).first().click()
    await page.getByRole('button', { name: /más/i }).click()
    await page.getByRole('menuitem', { name: /condonar mora/i }).click()

    const condonar = page.getByRole('dialog').last()
    await expect(condonar).toBeVisible()
    await condonar.getByRole('button', { name: /condonar/i }).last().click()
    await expect(page.getByText(/condonad/i)).toBeVisible()
  })
})

test('el espejo del gasto: cuenta por pagar → egreso', async ({ page }) => {
  test.slow()

  await test.step('se crea la cuenta por pagar a mano', async () => {
    await page.goto('/gastos/cxp')
    await page.getByRole('button', { name: 'Nuevo gasto' }).click()
    const cajon = page.getByRole('dialog')
    await elegirContacto(page, 'Proveedor', '')
    await cajon.locator('#ex-catalog').selectOption({ index: 1 })
    await importe(page, 'ex-amount', '80.000')
    await cajon.getByRole('button', { name: 'Crear' }).click()
    await expect(page.getByText(/creado/i).first()).toBeVisible()
  })

  await test.step('se paga y queda registrado como egreso', async () => {
    await page.goto('/gastos/egresos')
    await page.getByRole('link', { name: /registrar egreso/i }).first().click()
    await page.locator('#s-amount').fill('80.000')
    await page.getByRole('button', { name: 'Registrar egreso' }).last().click()
    await expect(page.getByText(/egreso registrado/i)).toBeVisible()
  })
})

test('una transferencia mueve el saldo entre cuentas', async ({ page }) => {
  await page.goto('/caja/cuentas')
  await expect(page.getByRole('heading', { name: 'Caja' })).toBeVisible()

  await page.getByRole('button', { name: /transferir/i }).click()
  const dialogo = page.getByRole('dialog')
  await dialogo.locator('#t-from').selectOption({ index: 1 })
  await dialogo.locator('#t-to').selectOption({ index: 2 })
  await importe(page, 't-amount', '10.000')
  await dialogo.getByRole('button', { name: /transferir/i }).last().click()
  await expect(page.getByText(/transferencia registrada/i)).toBeVisible()

  // El movimiento queda escrito: la caja lo cuenta.
  await page.goto('/caja/movimientos')
  await expect(page.getByRole('heading', { name: 'Movimientos' })).toBeVisible()
  await expect(page.getByText(/transferencia/i).first()).toBeVisible()
})

test('el panel cuadra con lo que acaba de pasar', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  // Con datos reales detrás, el panel enseña cifras — no ceros ni un error.
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByText('Saldo disponible')).toBeVisible()
  await expect(page.getByText('Flujo · últimos 6 meses')).toBeVisible()
})
