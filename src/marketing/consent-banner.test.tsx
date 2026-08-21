import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConsentBanner } from './consent-banner'
import { _reiniciarClarity, consentimientoGuardado } from './consent'

beforeEach(() => {
  localStorage.clear()
  _reiniciarClarity()
  document.head.querySelectorAll('script[src*="clarity"]').forEach((s) => s.remove())
})

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
})

const scriptsDeClarity = () => document.head.querySelectorAll('script[src*="clarity.ms"]')

test('sin nada de terceros configurado, ni aparece', () => {
  vi.stubEnv('VITE_CLARITY_ID', '')
  render(<ConsentBanner />)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

/* La regla de fondo: por defecto no se carga NADA. Clarity entra solo con el sí. */
test('mientras se pregunta, no hay nada de terceros en la página', () => {
  vi.stubEnv('VITE_CLARITY_ID', 'abc123')
  render(<ConsentBanner />)

  expect(screen.getByRole('dialog')).toBeInTheDocument()
  expect(scriptsDeClarity()).toHaveLength(0)
})

test('al aceptar, entra Clarity y el aviso se va', async () => {
  vi.stubEnv('VITE_CLARITY_ID', 'abc123')
  render(<ConsentBanner />)
  await userEvent.click(screen.getByRole('button', { name: /aceptar/i }))

  expect(scriptsDeClarity()).toHaveLength(1)
  expect(consentimientoGuardado()).toBe('si')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('al rechazar, no entra nada y no se vuelve a preguntar', async () => {
  vi.stubEnv('VITE_CLARITY_ID', 'abc123')
  render(<ConsentBanner />)
  await userEvent.click(screen.getByRole('button', { name: /no, gracias/i }))

  expect(scriptsDeClarity()).toHaveLength(0)
  expect(consentimientoGuardado()).toBe('no')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

/*
  Las dos opciones tienen que pesar lo mismo. Un «rechazar» escondido al lado de un
  «aceptar» de color no es una elección: es un embudo.
*/
test('las dos respuestas se ofrecen igual de disponibles', () => {
  vi.stubEnv('VITE_CLARITY_ID', 'abc123')
  render(<ConsentBanner />)

  const aceptar = screen.getByRole('button', { name: /aceptar/i })
  const rechazar = screen.getByRole('button', { name: /no, gracias/i })
  expect(aceptar).toBeEnabled()
  expect(rechazar).toBeEnabled()
  // Mismo alto y los dos ocupando su mitad: ninguno es un enlace escondido.
  expect(aceptar.className).toContain('h-10')
  expect(rechazar.className).toContain('h-10')
  expect(rechazar.className).toContain('flex-1')
})
