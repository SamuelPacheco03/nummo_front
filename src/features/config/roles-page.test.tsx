import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import type { CustomRole } from '@/api/generated/model'

const m = vi.hoisted(() => ({
  roles: [] as CustomRole[],
  archivar: vi.fn(),
  avisos: [] as string[],
  permisos: new Set<string>(['organization.roles.read', 'organization.roles.manage']),
  feature: true,
}))

vi.mock('sonner', () => ({
  toast: { success: (t: string) => m.avisos.push(t), error: (t: string) => m.avisos.push(t) },
}))
vi.mock('@/features/organizations/hooks', () => ({ useCurrentOrg: () => ({ orgId: 'o1' }) }))
vi.mock('@/features/platform/permissions', async () => {
  const real = await vi.importActual<typeof import('@/features/platform/permissions')>(
    '@/features/platform/permissions',
  )
  return {
    ...real,
    useCan: () => (permiso: string) => m.permisos.has(permiso),
    useFeature: () => m.feature,
  }
})
vi.mock('./hooks', () => ({
  useCustomRoles: () => ({ roles: m.roles, isPending: false, isError: false, error: null }),
  useDeleteCustomRole: () => ({ mutateAsync: m.archivar, isPending: false }),
}))

const { RolesPage } = await import('./roles-page')

function rol(over: Partial<CustomRole> = {}): CustomRole {
  return {
    id: 'r1',
    name: 'Cajero',
    description: 'Registra pagos y nada más.',
    permissions: ['payments.read', 'payments.create'],
    membersCount: 2,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...over,
  }
}

const pintar = () =>
  render(
    <MemoryRouter>
      <RolesPage />
    </MemoryRouter>,
  )

beforeEach(() => {
  m.roles = [rol()]
  m.archivar = vi.fn().mockResolvedValue({})
  m.avisos = []
  m.permisos = new Set(['organization.roles.read', 'organization.roles.manage'])
  m.feature = true
})
afterEach(cleanup)

test('un rol se resume por las áreas que toca, no por su lista de claves', () => {
  // Con recursos salían siete etiquetas que se desbordaban a dos renglones y
  // había que leerlas todas para saber de qué iba el rol.
  pintar()

  expect(screen.getByText('Cajero')).toBeInTheDocument()
  expect(screen.getByText('2 permisos')).toBeInTheDocument()
  expect(screen.getByText('2 miembros')).toBeInTheDocument()
  expect(screen.getByText('Cartera')).toBeInTheDocument()
})

test('un rol sin miembros se lee distinto: es el que se puede archivar sin mover a nadie', () => {
  m.roles = [rol({ membersCount: 0 })]
  pintar()

  expect(screen.getByText('Sin miembros')).toBeInTheDocument()
})

test('sin la feature se sigue viendo lo que hay, y solo desaparece el botón', () => {
  /*
    Escribir roles se vende con el plan; leerlos no. Quien baja de plan conserva
    los que definió y sus miembros siguen trabajando: se bloquea crear, nunca se
    borra — esconder la lista entera diría lo contrario.
  */
  m.feature = false
  pintar()

  expect(screen.getByText('Cajero')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Nuevo rol' })).not.toBeInTheDocument()
  expect(screen.getByText(/Crear roles propios es de un plan superior/)).toBeInTheDocument()
})

test('archivar pide confirmación y avisa al terminar', async () => {
  pintar()
  await userEvent.click(screen.getByRole('button', { name: 'Archivar Cajero' }))
  await userEvent.click(screen.getByRole('button', { name: 'Archivar' }))

  expect(m.archivar).toHaveBeenCalledWith({ orgId: 'o1', roleId: 'r1' })
  expect(m.avisos.at(-1)).toBe('Rol archivado')
})

test('sin roles todavía se explica para qué sirven', () => {
  m.roles = []
  pintar()

  expect(screen.getByText('Todavía no hay roles propios')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /crear el primero/i })).toBeInTheDocument()
})
