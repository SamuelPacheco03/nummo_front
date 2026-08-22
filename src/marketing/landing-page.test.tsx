import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'

/*
  La portada entera, montada para vigilar lo que ningún test de componente puede ver: que
  sus enlaces internos lleguen a alguna parte.

  «Ver cómo funciona» apuntó durante toda la fase 2 a un `#demo` que no existía en ninguna
  sección. El test del hero comprobaba que el enlace estuviera ahí —y lo estaba—, así que el
  fallo pasó por delante de la suite entera sin despeinarse: un ancla rota no lanza, no
  avisa y no cambia nada en pantalla salvo que no pasa nada al pulsarla.
*/

const getPricing = vi.fn()
vi.mock('@/api/generated/endpoints/public/public', () => ({
  getApiV1PublicPricing: () => getPricing(),
  postApiV1PublicSignals: vi.fn(),
}))

const { LandingPage } = await import('./landing-page')

beforeEach(() => {
  getPricing.mockReset()
  getPricing.mockResolvedValue({ status: 200, data: { plans: [] } })
})
afterEach(() => {
  cleanup()
})

test('todos los enlaces internos llegan a una sección que existe', () => {
  const { container } = render(<LandingPage />)

  const anclas = [...container.querySelectorAll('a[href^="#"]')]
    .map((a) => a.getAttribute('href')!)
    .filter((h) => h !== '#')

  // Si algún día no queda ninguno, el test se convierte en decoración sin decirlo.
  expect(anclas.length).toBeGreaterThan(0)

  const rotas = anclas.filter((h) => !container.querySelector(`[id="${h.slice(1)}"]`))
  expect(rotas).toEqual([])
})

/*
  Las tres afirmaciones que se comprobaron contra el contrato y resultaron falsas (§97.18).
  Se vigilan por texto porque el riesgo no es que alguien las reescriba a propósito: es que
  vuelvan copiadas del mockup, que es de donde salieron.
*/
test('la portada no promete integración bancaria', () => {
  const { container } = render(<LandingPage />)
  const texto = container.textContent ?? ''

  // `contract/openapi.json` no tiene una sola ruta de banco en 161, y el handoff de la
  // fase 10 lo dice con todas las letras: «Nummo no mueve dinero real, registra».
  expect(texto).not.toMatch(/banco conectad|conecta tu banco|sincroniz\w* con tu banco/i)
})
