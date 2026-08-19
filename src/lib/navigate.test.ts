import { afterEach, expect, test, vi } from 'vitest'
import { navigateApp, setAppNavigate } from './navigate'

afterEach(() => {
  setAppNavigate(null)
  vi.unstubAllGlobals()
})

test('navega con el router cuando el shell lo ha prestado', () => {
  const destinos: string[] = []
  setAppNavigate((to) => destinos.push(to))

  navigateApp('/config/plan')

  expect(destinos).toEqual(['/config/plan'])
})

test('sin nadie registrado recarga, pero llega', () => {
  // Recargar es peor que navegar; un botón que no hace nada es mucho peor.
  const assign = vi.fn()
  vi.stubGlobal('location', { assign })

  navigateApp('/config/plan')

  expect(assign).toHaveBeenCalledWith('/config/plan')
})

test('desmontar el shell suelta el navegador en vez de dejar uno muerto', () => {
  const destinos: string[] = []
  const assign = vi.fn()
  setAppNavigate((to) => destinos.push(to))
  setAppNavigate(null)
  vi.stubGlobal('location', { assign })

  navigateApp('/config/plan')

  expect(destinos).toEqual([])
  expect(assign).toHaveBeenCalledOnce()
})
