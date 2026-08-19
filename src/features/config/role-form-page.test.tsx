import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import type { CustomRole } from '@/api/generated/model'

const m = vi.hoisted(() => ({
  role: undefined as CustomRole | undefined,
  crear: vi.fn(),
  actualizar: vi.fn(),
  avisos: [] as string[],
  rutas: [] as string[],
}))

vi.mock('sonner', () => ({
  toast: { success: (t: string) => m.avisos.push(t), error: (t: string) => m.avisos.push(t) },
}))
vi.mock('@/features/organizations/hooks', () => ({ useCurrentOrg: () => ({ orgId: 'o1' }) }))
vi.mock('react-router', async () => {
  const real = await vi.importActual<typeof import('react-router')>('react-router')
  return { ...real, useNavigate: () => (to: string) => m.rutas.push(to) }
})
vi.mock('./hooks', () => ({
  useCustomRole: () => ({ role: m.role, isPending: false, isError: false, error: null }),
  useCreateCustomRole: () => ({ mutateAsync: m.crear, isPending: false }),
  useUpdateCustomRole: () => ({ mutateAsync: m.actualizar, isPending: false }),
}))

const { RoleFormPage } = await import('./role-form-page')

function pintar(ruta = '/config/roles/nuevo') {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/config/roles/nuevo" element={<RoleFormPage />} />
        <Route path="/config/roles/:roleId" element={<RoleFormPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  m.role = undefined
  m.crear = vi.fn().mockResolvedValue({})
  m.actualizar = vi.fn().mockResolvedValue({})
  m.avisos = []
  m.rutas = []
})
afterEach(cleanup)

test('ofrece el catálogo entero agrupado por área, no una lista plana de 53', () => {
  pintar()

  expect(screen.getByRole('heading', { name: 'Cartera' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Organización' })).toBeInTheDocument()
  expect(screen.getByText('Cuentas por cobrar')).toBeInTheDocument()
})

test('un rol sin permisos no se guarda: casi siempre es un olvido', async () => {
  pintar()
  await userEvent.type(screen.getByLabelText(/Nombre/), 'Cajero')
  await userEvent.click(screen.getByRole('button', { name: 'Crear rol' }))

  expect(m.crear).not.toHaveBeenCalled()
  expect(m.avisos.at(-1)).toMatch(/al menos un permiso/)
})

test('un rol sin nombre tampoco', async () => {
  pintar()
  await userEvent.click(screen.getByRole('button', { name: 'Crear rol' }))

  expect(m.crear).not.toHaveBeenCalled()
  expect(m.avisos.at(-1)).toMatch(/necesita un nombre/)
})

test('«Todo» marca el recurso entero, que es como se piensa un rol', async () => {
  pintar()
  await userEvent.type(screen.getByLabelText(/Nombre/), 'Cajero')

  // Pagos: ver, registrar, repartir anticipos y reversar.
  const pagos = screen.getByText('Pagos').closest('div')!.parentElement!
  await userEvent.click(within(pagos).getByRole('button', { name: 'Todo' }))
  await userEvent.click(screen.getByRole('button', { name: 'Crear rol' }))

  expect(m.crear).toHaveBeenCalledTimes(1)
  const enviado = m.crear.mock.calls[0][0].data
  expect(enviado.permissions.sort()).toEqual(
    ['payments.allocate', 'payments.create', 'payments.read', 'payments.reverse'].sort(),
  )
  expect(m.rutas.at(-1)).toBe('/config/roles')
})

test('editar llega con lo que el rol ya tenía marcado', () => {
  // Sin esto, guardar un cambio de nombre borraría los permisos: el formulario
  // manda el conjunto entero.
  m.role = {
    id: 'r1',
    name: 'Cajero',
    description: null,
    permissions: ['payments.read'],
    membersCount: 1,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  }
  pintar('/config/roles/r1')

  expect(screen.getByLabelText(/Nombre/)).toHaveValue('Cajero')
  expect(screen.getByText('1 permiso elegido')).toBeInTheDocument()
})
