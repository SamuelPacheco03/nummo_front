import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { NumiWidget } from './numi-widget'
import { useNumiStore } from './numi-store'

/*
  Igual que en el hilo: aquí se mockean los endpoints, no los hooks. Lo que se prueba
  es el recorrido entero —abrir la lista, cambiar de conversación, renombrar, borrar—
  y buena parte de él es el refresco de la lista después de escribir, que un doble del
  hook se saltaría.
*/
const m = vi.hoisted(() => ({
  conversaciones: [] as { id: string; title: string; messageCount: number; lastMessageAt: string }[],
  renombrados: [] as { id: string; title: string }[],
  borrados: [] as string[],
}))

const mensaje = (id: string, content: string) => ({
  id,
  role: 'user' as const,
  content,
  source: 'text' as const,
  hasAudio: false,
  waveform: null,
  audioSeconds: null,
  createdAt: '2026-08-16T00:00:00.000Z',
})

vi.mock('@/features/organizations/hooks', () => ({
  useCurrentOrg: () => ({ orgId: 'o1', role: 'OWNER', organization: { name: 'Demo' } }),
}))

vi.mock('@/api/generated/endpoints/assistant/assistant', () => ({
  getApiV1OrganizationsOrgIdAssistantConversations: () =>
    Promise.resolve({ data: { items: m.conversaciones, nextCursor: null } }),
  getApiV1OrganizationsOrgIdAssistantConversationsIdMessages: (_orgId: string, id: string) =>
    Promise.resolve({
      data: { items: [mensaje(`${id}-m1`, `lo hablado en ${id}`)], nextCursor: null },
    }),
  getApiV1OrganizationsOrgIdAssistantConversationsIdMessagesMessageIdAudio: vi.fn(),
  usePutApiV1OrganizationsOrgIdAssistantConversationsIdMessagesMessageIdFeedback: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
  usePostApiV1OrganizationsOrgIdAssistantChat: () => ({ isPending: false, mutateAsync: vi.fn() }),
  usePostApiV1OrganizationsOrgIdAssistantChatAudio: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
  usePostApiV1OrganizationsOrgIdAssistantChatImage: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
  usePatchApiV1OrganizationsOrgIdAssistantConversationsId: () => ({
    isPending: false,
    mutateAsync: async ({ id, data }: { id: string; data: { title: string } }) => {
      m.renombrados.push({ id, title: data.title })
      const found = m.conversaciones.find((c) => c.id === id)
      if (found) found.title = data.title
      return { data: found }
    },
  }),
  useDeleteApiV1OrganizationsOrgIdAssistantConversationsId: () => ({
    isPending: false,
    mutateAsync: async ({ id }: { id: string }) => {
      m.borrados.push(id)
      m.conversaciones = m.conversaciones.filter((c) => c.id !== id)
      return { data: undefined }
    },
  }),
}))

function pintar() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <NumiWidget />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** Abre el panel y se pasa a la lista de conversaciones. */
async function abrirLista(user: ReturnType<typeof userEvent.setup>) {
  pintar()
  useNumiStore.getState().open()
  await user.click(await screen.findByRole('button', { name: 'Ver mis conversaciones' }))
}

/** El menú de acciones de una fila, por el nombre de la conversación. */
async function abrirMenuDe(user: ReturnType<typeof userEvent.setup>, titulo: string) {
  await user.click(await screen.findByRole('button', { name: `Opciones de ${titulo}` }))
}

beforeEach(() => {
  m.conversaciones = [
    { id: 'c1', title: 'Cartera de septiembre', messageCount: 12, lastMessageAt: '2026-08-16T10:00:00.000Z' },
    { id: 'c2', title: 'Egresos del mes', messageCount: 3, lastMessageAt: '2026-08-15T10:00:00.000Z' },
  ]
  m.renombrados = []
  m.borrados = []
  localStorage.clear()
  useNumiStore.setState({
    isOpen: false,
    orgId: null,
    sessionId: undefined,
    messages: [],
    error: null,
    hydrated: false,
    historyId: null,
    unread: false,
    pending: false,
  })
})
afterEach(cleanup)

test('la lista enseña cada conversación con su nombre y su tamaño', async () => {
  const user = userEvent.setup()
  await abrirLista(user)

  expect(await screen.findByText('Cartera de septiembre')).toBeInTheDocument()
  expect(screen.getByText('Egresos del mes')).toBeInTheDocument()
  expect(screen.getByText('12 mensajes')).toBeInTheDocument()
  // Singular y plural, que un «1 mensajes» se lee mal.
  expect(screen.queryByText('3 mensaje')).not.toBeInTheDocument()
  expect(screen.getByText('3 mensajes')).toBeInTheDocument()
})

test('elegir una conversación la abre en el hilo y sustituye lo que había', async () => {
  const user = userEvent.setup()
  await abrirLista(user)

  await user.click(await screen.findByText('Egresos del mes'))

  // Vuelve al hilo solo, con la conversación elegida dentro.
  expect(await screen.findByText('lo hablado en c2')).toBeInTheDocument()
  expect(useNumiStore.getState().sessionId).toBe('c2')
  // Y es historia del servidor, así que se puede seguir hacia atrás.
  expect(useNumiStore.getState().historyId).toBe('c2')
  expect(screen.queryByText('Cartera de septiembre')).not.toBeInTheDocument()
})

test('renombrar cambia el nombre en la lista, no solo en el diálogo', async () => {
  const user = userEvent.setup()
  await abrirLista(user)
  await screen.findByText('Cartera de septiembre')

  await abrirMenuDe(user, 'Cartera de septiembre')
  await user.click(await screen.findByRole('menuitem', { name: 'Renombrar' }))

  const campo = await screen.findByLabelText(/Nombre/)
  await user.clear(campo)
  await user.type(campo, '  Cobros del colegio  ')
  await user.click(screen.getByRole('button', { name: 'Guardar' }))

  // Se manda recortado: el espacio de más es invisible y ordena distinto.
  expect(m.renombrados).toEqual([{ id: 'c1', title: 'Cobros del colegio' }])
  expect(await screen.findByText('Cobros del colegio')).toBeInTheDocument()
})

test('borrar pide confirmación y saca la conversación de la lista', async () => {
  const user = userEvent.setup()
  await abrirLista(user)
  await screen.findByText('Egresos del mes')

  await abrirMenuDe(user, 'Egresos del mes')
  await user.click(await screen.findByRole('menuitem', { name: 'Borrar' }))

  // Nada se ha borrado todavía: primero se pregunta.
  expect(m.borrados).toEqual([])
  const dialogo = await screen.findByRole('dialog', { name: /Borrar esta conversación/ })
  await user.click(within(dialogo).getByRole('button', { name: 'Borrar' }))

  expect(m.borrados).toEqual(['c2'])
  expect(await screen.findByText('Cartera de septiembre')).toBeInTheDocument()
  expect(screen.queryByText('Egresos del mes')).not.toBeInTheDocument()
})

test('borrar la conversación abierta deja el hilo en blanco, no hablando de un fantasma', async () => {
  const user = userEvent.setup()
  await abrirLista(user)

  await user.click(await screen.findByText('Cartera de septiembre'))
  await screen.findByText('lo hablado en c1')
  expect(useNumiStore.getState().sessionId).toBe('c1')

  await user.click(screen.getByRole('button', { name: 'Ver mis conversaciones' }))
  await abrirMenuDe(user, 'Cartera de septiembre')
  await user.click(await screen.findByRole('menuitem', { name: 'Borrar' }))
  const dialogo = await screen.findByRole('dialog', { name: /Borrar esta conversación/ })
  await user.click(within(dialogo).getByRole('button', { name: 'Borrar' }))

  /*
    Seguir con ese `sessionId` habría mandado el siguiente mensaje a una conversación
    que el servidor ya no reconoce. Se empieza una nueva, que es lo que el backend
    haría de todas formas.
  */
  expect(useNumiStore.getState().sessionId).toBeUndefined()
  expect(useNumiStore.getState().messages).toEqual([])
})
