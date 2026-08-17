import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import type { AnyRole } from '@/features/organizations/roles'
import { useNumiStore } from '@/features/assistant/numi-store'

const role = vi.hoisted(() => ({ current: 'OWNER' as AnyRole }))
const contacts = vi.hoisted(() => ({ current: [] as { id: string; displayName: string }[] }))

vi.mock('@/features/organizations/hooks', () => ({
  useCurrentOrg: () => ({ role: role.current, orgId: 'org-1', organization: undefined }),
}))
vi.mock('@/features/contacts/hooks', () => ({
  useContacts: () => ({ contacts: contacts.current, isFetching: false }),
}))

const { CommandBar } = await import('./command-bar')

beforeEach(() => {
  role.current = 'OWNER'
  contacts.current = []
  useNumiStore.setState({ isOpen: false })
})
afterEach(cleanup)

function renderBar() {
  const router = createMemoryRouter(
    [{ path: '*', element: <CommandBar open onOpenChange={() => {}} /> }],
    { initialEntries: ['/'] },
  )
  return render(<RouterProvider router={router} />)
}

test('es un punto de entrada universal: registrar, ir y preguntar', () => {
  renderBar()

  expect(screen.getByRole('option', { name: /registrar pago/i })).toBeInTheDocument()
  expect(screen.getByRole('option', { name: /cuentas por cobrar/i })).toBeInTheDocument()
  expect(screen.getByRole('option', { name: /preguntarle algo a numi/i })).toBeInTheDocument()
})

test('filtra por texto, ignorando acentos y mayúsculas', async () => {
  renderBar()
  await userEvent.type(screen.getByRole('textbox'), 'CATEGORIAS')

  // La búsqueda va con rebote de 250 ms. Se espera a que DESAPAREZCA lo que no
  // coincide: que aparezca lo que sí coincide no prueba nada, porque sin filtro
  // la lista ya las muestra todas.
  await waitFor(() =>
    expect(screen.queryByRole('option', { name: /registrar pago/i })).not.toBeInTheDocument(),
  )
  // "Categorías de gasto" vive en Configuración › Catálogos.
  expect(screen.getByRole('option', { name: /categorías de gasto/i })).toBeInTheDocument()
})

test('Numi sigue disponible aunque nada más coincida', async () => {
  renderBar()
  await userEvent.type(screen.getByRole('textbox'), 'cuánto me debe Laura')

  expect(await screen.findByRole('option', { name: /preguntarle a numi/i })).toBeInTheDocument()
})

test('ofrece los contactos que devuelve la búsqueda', async () => {
  contacts.current = [{ id: 'c1', displayName: 'Laura Gómez' }]
  renderBar()
  await userEvent.type(screen.getByRole('textbox'), 'laura')

  expect(await screen.findByRole('option', { name: /laura gómez/i })).toBeInTheDocument()
})

test('respeta los permisos: un lector no puede registrar nada', () => {
  role.current = 'VIEWER'
  renderBar()

  expect(screen.queryByRole('option', { name: /registrar pago/i })).not.toBeInTheDocument()
  // Pero sí puede navegar y preguntar.
  expect(screen.getByRole('option', { name: /cuentas por cobrar/i })).toBeInTheDocument()
  expect(screen.getByRole('option', { name: /preguntarle algo a numi/i })).toBeInTheDocument()
})

test('se recorre con las flechas y se ejecuta con Enter', async () => {
  renderBar()
  const input = screen.getByRole('textbox')

  const options = screen.getAllByRole('option')
  expect(options[0]).toHaveAttribute('aria-selected', 'true')

  await userEvent.type(input, '{ArrowDown}')
  expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true')

  await userEvent.type(input, '{ArrowUp}{ArrowUp}')
  // Envuelve por el final en vez de quedarse clavada en el primero.
  const all = screen.getAllByRole('option')
  expect(all[all.length - 1]).toHaveAttribute('aria-selected', 'true')
})

test('Enter sobre la opción de Numi abre el asistente', async () => {
  role.current = 'VIEWER'
  renderBar()
  const input = screen.getByRole('textbox')

  await userEvent.type(input, '{ArrowUp}') // envuelve a la última: Numi
  expect(useNumiStore.getState().isOpen).toBe(false)

  await userEvent.type(input, '{Enter}')
  expect(useNumiStore.getState().isOpen).toBe(true)
})
