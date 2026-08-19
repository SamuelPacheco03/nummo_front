import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { Search } from 'lucide-react'
import { useNumiStore } from '@/features/assistant/numi-store'

const TODOS = [
  'payments.create',
  'disbursements.create',
  'receivables.create',
  'contacts.write',
  'agreements.manage',
  'treasury.transfer',
]
const permisos = vi.hoisted(() => ({ current: new Set<string>() }))
const hits = vi.hoisted(() => ({ current: [] as { title: string; items: unknown[] }[] }))

vi.mock('@/features/organizations/hooks', () => ({
  useCurrentOrg: () => ({ orgId: 'org-1', organization: undefined }),
}))
// Las acciones de la paleta se filtran por permiso, igual que en la barra de móvil.
vi.mock('@/features/platform/permissions', () => ({
  useCan: () => (permiso: string) => permisos.current.has(permiso),
}))
/*
  La búsqueda contra el servidor se sustituye entera: lo que se prueba aquí es la
  paleta —qué ofrece, cómo filtra, cómo se recorre—, no las cinco consultas. Con
  el hook real haría falta montar un `QueryClientProvider` en cada test para
  comprobar cosas que no dependen de él.
*/
vi.mock('./use-global-search', () => ({
  useGlobalSearch: () => ({ groups: hits.current, isFetching: false }),
}))

const { CommandBar } = await import('./command-bar')

beforeEach(() => {
  permisos.current = new Set(TODOS)
  hits.current = []
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

test('sin escribir ofrece registrar y preguntar, no el catálogo entero', () => {
  renderBar()

  expect(screen.getByRole('option', { name: /registrar pago/i })).toBeInTheDocument()
  expect(screen.getByRole('option', { name: /preguntarle algo a numi/i })).toBeInTheDocument()
  // Las secciones ya no se listan de entrada: veinte destinos sin orden no son
  // una sugerencia. Aparecen al escribir.
  expect(screen.queryByRole('option', { name: /^cuentas por cobrar$/i })).not.toBeInTheDocument()
})

test('las secciones aparecen al escribir', async () => {
  renderBar()
  await userEvent.type(screen.getByRole('textbox'), 'cuentas por cobrar')

  // Coincide la sección y también «Nueva cuenta por cobrar»: basta con que la
  // navegación aparezca al escribir.
  const found = await screen.findAllByRole('option', { name: /cuentas por cobrar/i })
  expect(found.length).toBeGreaterThan(0)
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

test('ofrece lo que devuelve la búsqueda del servidor', async () => {
  hits.current = [
    {
      title: 'Contactos',
      items: [
        { id: 'contact:c1', kind: 'contact', label: 'Laura Gómez', to: '/contactos/c1', Icon: Search, details: [] },
      ],
    },
  ]
  renderBar()
  await userEvent.type(screen.getByRole('textbox'), 'laura')

  expect(await screen.findByRole('option', { name: /laura gómez/i })).toBeInTheDocument()
})

test('respeta los permisos: sin ninguno de registro no se ofrece registrar nada', async () => {
  permisos.current = new Set()
  renderBar()

  expect(screen.queryByRole('option', { name: /registrar pago/i })).not.toBeInTheDocument()
  // Pero sí puede preguntar…
  expect(screen.getByRole('option', { name: /preguntarle algo a numi/i })).toBeInTheDocument()
  // …y navegar.
  await userEvent.type(screen.getByRole('textbox'), 'cuentas por cobrar')
  expect((await screen.findAllByRole('option', { name: /cuentas por cobrar/i })).length)
    .toBeGreaterThan(0)
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
  permisos.current = new Set()
  renderBar()
  const input = screen.getByRole('textbox')

  await userEvent.type(input, '{ArrowUp}') // envuelve a la última: Numi
  expect(useNumiStore.getState().isOpen).toBe(false)

  await userEvent.type(input, '{Enter}')
  expect(useNumiStore.getState().isOpen).toBe(true)
})
