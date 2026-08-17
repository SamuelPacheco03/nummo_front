import { afterEach, expect, test } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { SettingsLayout, SETTINGS_PATHS, isSettingsPath } from './settings-layout'

afterEach(cleanup)

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      {
        element: <SettingsLayout />,
        children: SETTINGS_PATHS.map((p) => ({
          path: p.slice(1),
          element: <h1>Contenido de {p}</h1>,
        })),
      },
    ],
    { initialEntries: [path] },
  )
  return render(<RouterProvider router={router} />)
}

test('agrupa los ajustes bajo títulos de usuario, no de backend', () => {
  renderAt('/config/empresa')

  // Hay dos <nav> (escritorio y móvil); basta con mirar el de escritorio.
  const nav = screen.getAllByRole('navigation', { name: 'Configuración' })[0]
  expect(within(nav).getByText('Organización')).toBeInTheDocument()
  expect(within(nav).getByText('Preferencias')).toBeInTheDocument()
  expect(within(nav).getByText('Catálogos')).toBeInTheDocument()
  // "Maestros" era jerga de backend y no debe volver.
  expect(within(nav).queryByText('Maestros')).not.toBeInTheDocument()
})

test('los catálogos y las políticas de interés viven aquí, no en el sidebar', () => {
  renderAt('/config/empresa')
  const nav = screen.getAllByRole('navigation', { name: 'Configuración' })[0]

  for (const label of [
    'Conceptos de cobro',
    'Categorías de gasto',
    'Métodos de pago',
    'Políticas de interés',
  ]) {
    expect(within(nav).getByRole('link', { name: label })).toBeInTheDocument()
  }
})

test('marca como página actual el ajuste abierto', () => {
  renderAt('/maestros/conceptos')
  const nav = screen.getAllByRole('navigation', { name: 'Configuración' })[0]

  expect(within(nav).getByRole('link', { name: 'Conceptos de cobro' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  expect(within(nav).getByRole('link', { name: 'Empresa' })).not.toHaveAttribute('aria-current')
})

test('las URLs no cambian: las rutas antiguas siguen resolviendo', () => {
  renderAt('/cartera/interes')
  expect(screen.getByRole('heading', { name: 'Contenido de /cartera/interes' })).toBeInTheDocument()
})

test('isSettingsPath reconoce lo que cuelga de Configuración', () => {
  expect(isSettingsPath('/config/empresa')).toBe(true)
  expect(isSettingsPath('/maestros/cuentas')).toBe(true)
  expect(isSettingsPath('/cartera/interes')).toBe(true)
  // No confundir la caja ni la cartera operativa con su homónimo de ajustes.
  expect(isSettingsPath('/caja/cuentas')).toBe(false)
  expect(isSettingsPath('/cartera/cxc')).toBe(false)
  expect(isSettingsPath('/')).toBe(false)
})
