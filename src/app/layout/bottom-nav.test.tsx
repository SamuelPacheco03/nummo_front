import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { useNumiStore } from '@/features/assistant/numi-store'

// Las acciones se filtran por permiso, no por nombre de rol: el shell solo
// necesita el predicado. Montar las capacidades reales arrastraría el cliente
// HTTP y la sesión, que no son lo que se está probando.
const TODOS = [
  'payments.create',
  'disbursements.create',
  'receivables.create',
  'contacts.write',
  'agreements.manage',
  'treasury.transfer',
]
const permisos = vi.hoisted(() => ({ current: new Set<string>() }))
vi.mock('@/features/platform/permissions', () => ({
  useCan: () => (permiso: string) => permisos.current.has(permiso),
}))
// SidebarBody arrastra el selector de organización y el menú de usuario.
vi.mock('./sidebar', () => ({
  Brand: () => null,
  SidebarBody: () => <nav aria-label="Principal">Sidebar completo</nav>,
}))

const { BottomNav } = await import('./bottom-nav')

beforeEach(() => {
  permisos.current = new Set(TODOS)
  useNumiStore.setState({ isOpen: false })
})
afterEach(cleanup)

function renderNav(initial = '/') {
  const router = createMemoryRouter(
    [
      { path: '/', element: <BottomNav /> },
      { path: '*', element: <BottomNav /> },
    ],
    { initialEntries: [initial] },
  )
  return render(<RouterProvider router={router} />)
}

test('ofrece los cinco destinos de §15', () => {
  renderNav()
  const nav = screen.getByRole('navigation', { name: 'Navegación principal' })

  expect(within(nav).getByRole('link', { name: /inicio/i })).toBeInTheDocument()
  expect(within(nav).getByRole('link', { name: /cartera/i })).toBeInTheDocument()
  expect(within(nav).getByRole('button', { name: /nuevo/i })).toBeInTheDocument()
  expect(within(nav).getByRole('button', { name: /numi/i })).toBeInTheDocument()
  expect(within(nav).getByRole('button', { name: /más/i })).toBeInTheDocument()
})

test('"Nuevo" abre las acciones de registro', async () => {
  renderNav()
  await userEvent.click(screen.getByRole('button', { name: /nuevo/i }))

  expect(screen.getByRole('button', { name: /registrar pago/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /registrar egreso/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /transferencia/i })).toBeInTheDocument()
})

test('las acciones respetan el permiso: sin ninguno no se dibuja "Nuevo"', () => {
  permisos.current = new Set()
  renderNav()

  expect(screen.queryByRole('button', { name: /nuevo/i })).not.toBeInTheDocument()
})

test('sin el permiso de acuerdos no se ofrece crear uno, pero sí registrar un pago', async () => {
  permisos.current = new Set(TODOS.filter((p) => p !== 'agreements.manage'))
  renderNav()
  await userEvent.click(screen.getByRole('button', { name: /nuevo/i }))

  expect(screen.getByRole('button', { name: /registrar pago/i })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /nuevo acuerdo/i })).not.toBeInTheDocument()
})

test('"Numi" abre el asistente en vez de navegar', async () => {
  renderNav()
  expect(useNumiStore.getState().isOpen).toBe(false)

  await userEvent.click(screen.getByRole('button', { name: /numi/i }))
  expect(useNumiStore.getState().isOpen).toBe(true)
})

test('"Más" abre el sidebar completo, no una segunda navegación', async () => {
  renderNav()
  await userEvent.click(screen.getByRole('button', { name: /más/i }))

  expect(await screen.findByText('Sidebar completo')).toBeInTheDocument()
})

test('marca el destino actual', () => {
  renderNav('/cartera/cxc')
  const nav = screen.getByRole('navigation', { name: 'Navegación principal' })

  expect(within(nav).getByRole('link', { name: /cartera/i })).toHaveAttribute(
    'aria-current',
    'page',
  )
  expect(within(nav).getByRole('link', { name: /inicio/i })).not.toHaveAttribute('aria-current')
})

test('"Cartera" sigue encendida en cuentas por pagar, que es la misma sección', () => {
  renderNav('/gastos/cxp')
  const nav = screen.getByRole('navigation', { name: 'Navegación principal' })

  expect(within(nav).getByRole('link', { name: /cartera/i })).toHaveAttribute(
    'aria-current',
    'page',
  )
})

test('"Cartera" también en el detalle de una cuenta, no solo en la lista', () => {
  renderNav('/gastos/cxp/exp-1')
  const nav = screen.getByRole('navigation', { name: 'Navegación principal' })

  expect(within(nav).getByRole('link', { name: /cartera/i })).toHaveAttribute(
    'aria-current',
    'page',
  )
})

test('"Inicio" solo se enciende en la raíz', () => {
  renderNav('/cartera/cxc')
  const nav = screen.getByRole('navigation', { name: 'Navegación principal' })

  expect(within(nav).getByRole('link', { name: /inicio/i })).not.toHaveAttribute('aria-current')
})
