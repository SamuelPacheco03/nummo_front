import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import type { AnyRole } from '@/features/organizations/roles'
import { useNumiStore } from '@/features/assistant/numi-store'

// El shell de la barra solo necesita saber el rol; montar la organización real
// arrastraría el cliente HTTP y la sesión, que no son lo que se está probando.
const role = vi.hoisted(() => ({ current: 'OWNER' as AnyRole }))
vi.mock('@/features/organizations/hooks', () => ({
  useCurrentOrg: () => ({ role: role.current, orgId: 'org-1', organization: undefined }),
}))
// SidebarBody arrastra el selector de organización y el menú de usuario.
vi.mock('./sidebar', () => ({
  Brand: () => null,
  SidebarBody: () => <nav aria-label="Principal">Sidebar completo</nav>,
}))

const { BottomNav } = await import('./bottom-nav')

beforeEach(() => {
  role.current = 'OWNER'
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

test('las acciones respetan el rol: un lector no ve el botón "Nuevo"', () => {
  role.current = 'VIEWER'
  renderNav()

  expect(screen.queryByRole('button', { name: /nuevo/i })).not.toBeInTheDocument()
})

test('un operador no puede crear acuerdos, pero sí registrar pagos', async () => {
  role.current = 'OPERATOR'
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
