import { test, expect } from '@playwright/test'

/**
 * El asistente vive en el shell: disponible desde cualquier pantalla, con el
 * panel encima del contenido. No manda mensajes (eso exige un proveedor de IA
 * configurado), solo comprueba la puerta de entrada.
 */
test('Numi se abre desde el botón flotante y se cierra por la cabecera', async ({ page }) => {
  await page.goto('/')
  const launcher = page.getByRole('button', { name: 'Abrir el chat con Numi' })
  await expect(launcher).toBeVisible()

  await launcher.click()
  const panel = page.getByRole('dialog', { name: /Numi/ })
  await expect(panel).toBeVisible()
  await expect(panel.getByText('Hola, soy Numi')).toBeVisible()
  // Abierto no queda un segundo cierre flotando sobre el composer.
  await expect(launcher).toBeHidden()
  // Adjuntos y voz están preparados, pero aún no habilitados.
  await expect(panel.getByRole('button', { name: /Adjuntar archivo/ })).toBeDisabled()

  await panel.getByRole('button', { name: 'Cerrar el chat' }).click()
  await expect(panel).toBeHidden()
  await expect(launcher).toBeVisible()
})
