import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { NumiWidget } from './numi-widget'
import { useNumiStore } from './numi-store'

/*
  Se mockean los endpoints y no los hooks: lo que se prueba es el recorrido entero
  —escribir, buscar, abrir el resultado en su punto del hilo— y buena parte de él es qué
  parámetros salen hacia el servidor.
*/
const m = vi.hoisted(() => ({
  busquedas: [] as string[],
  paginas: [] as { id: string; until?: string }[],
  hits: [] as {
    messageId: string
    conversationId: string
    conversationTitle: string
    role: 'user' | 'assistant'
    excerpt: string
    createdAt: string
  }[],
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
vi.mock('./stream-chat', () => ({ streamChat: vi.fn(async () => ({ sessionId: 's1', reply: 'ok' })) }))

vi.mock('@/api/generated/endpoints/assistant/assistant', () => ({
  getApiV1OrganizationsOrgIdAssistantConversations: () =>
    Promise.resolve({
      data: {
        items: [
          { id: 'c1', title: 'Cartera', messageCount: 4, lastMessageAt: '2026-08-16T10:00:00.000Z' },
        ],
        nextCursor: null,
      },
    }),
  getApiV1OrganizationsOrgIdAssistantConversationsIdMessages: (
    _orgId: string,
    id: string,
    params: { until?: string },
  ) => {
    m.paginas.push({ id, until: params.until })
    return Promise.resolve({
      data: {
        items: [mensaje(params.until ?? 'ultimo', params.until ? 'lo buscado' : 'lo último')],
        nextCursor: null,
      },
    })
  },
  getApiV1OrganizationsOrgIdAssistantConversationsIdMessagesMessageIdAudio: vi.fn(),
  getApiV1OrganizationsOrgIdAssistantConversationsSearch: (_orgId: string, params: { q: string }) => {
    m.busquedas.push(params.q)
    return Promise.resolve({ data: { q: params.q, items: m.hits } })
  },
  usePatchApiV1OrganizationsOrgIdAssistantConversationsId: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
  useDeleteApiV1OrganizationsOrgIdAssistantConversationsId: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
  usePostApiV1OrganizationsOrgIdAssistantChat: () => ({ isPending: false, mutateAsync: vi.fn() }),
  usePostApiV1OrganizationsOrgIdAssistantChatAudio: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
}))

function pintar() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <NumiWidget />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function abrirLista(user: ReturnType<typeof userEvent.setup>) {
  pintar()
  useNumiStore.getState().open()
  await user.click(await screen.findByRole('button', { name: 'Ver mis conversaciones' }))
}

beforeEach(() => {
  m.busquedas = []
  m.paginas = []
  m.hits = [
    {
      messageId: 'msg-7',
      conversationId: 'c1',
      conversationTitle: 'Cartera de septiembre',
      role: 'assistant',
      excerpt: '…Ana Torres te debe $120.000 de la matrícula…',
      createdAt: '2026-08-16T10:00:00.000Z',
    },
  ]
  localStorage.clear()
  useNumiStore.setState({
    isOpen: false,
    orgId: null,
    sessionId: undefined,
    messages: [],
    error: null,
    hydrated: true,
    historyId: null,
    historyUntil: null,
    unread: false,
    pending: false,
  })
})
afterEach(cleanup)

test('el resultado dice de qué conversación salió y enseña el trozo buscado', async () => {
  const user = userEvent.setup()
  await abrirLista(user)

  await user.type(screen.getByLabelText('Buscar en mis conversaciones'), 'Ana')

  expect(await screen.findByText('Cartera de septiembre')).toBeInTheDocument()
  expect(screen.getByText(/Ana Torres te debe/)).toBeInTheDocument()
  // Quién lo dijo, que en un resultado suelto no se deduce del lado de la burbuja.
  expect(screen.getByText('Numi:')).toBeInTheDocument()
})

test('con una sola letra no se molesta al servidor', async () => {
  const user = userEvent.setup()
  await abrirLista(user)

  await user.type(screen.getByLabelText('Buscar en mis conversaciones'), 'A')

  // El servidor lo rechazaría, y una letra suelta traería medio historial.
  await new Promise((r) => setTimeout(r, 400))
  expect(m.busquedas).toEqual([])
})

test('se pregunta al dejar de escribir, no en cada tecla', async () => {
  const user = userEvent.setup()
  await abrirLista(user)

  await user.type(screen.getByLabelText('Buscar en mis conversaciones'), 'Ana')
  await waitFor(() => expect(m.busquedas.length).toBeGreaterThan(0))

  // «A», «An», «Ana» habrían sido tres viajes; el retraso los deja en uno.
  expect(m.busquedas).toEqual(['Ana'])
})

test('abrir un resultado lleva la conversación a ese mensaje, no al final', async () => {
  const user = userEvent.setup()
  await abrirLista(user)
  await user.type(screen.getByLabelText('Buscar en mis conversaciones'), 'Ana')

  await user.click(await screen.findByText(/Ana Torres te debe/))

  await waitFor(() => expect(useNumiStore.getState().sessionId).toBe('c1'))
  expect(await screen.findByText('lo buscado')).toBeInTheDocument()

  /*
    Y queda anotado por dónde se abrió: sin eso, subir en el hilo pediría la página más
    nueva y el usuario saltaría al final del historial que acaba de esquivar.
  */
  expect(useNumiStore.getState().historyUntil).toBe('msg-7')
  expect(m.paginas.at(-1)).toEqual({ id: 'c1', until: 'msg-7' })
})

test('sin resultados se dice, con el término que se buscó', async () => {
  const user = userEvent.setup()
  m.hits = []
  await abrirLista(user)

  await user.type(screen.getByLabelText('Buscar en mis conversaciones'), 'zzz')

  expect(await screen.findByText('Sin resultados')).toBeInTheDocument()
  expect(screen.getByText(/"zzz"/)).toBeInTheDocument()
})

test('mientras se busca, «nueva conversación» se quita de en medio', async () => {
  const user = userEvent.setup()
  await abrirLista(user)
  expect(screen.getByRole('button', { name: /Nueva conversación/ })).toBeInTheDocument()

  await user.type(screen.getByLabelText('Buscar en mis conversaciones'), 'Ana')

  await waitFor(() =>
    expect(screen.queryByRole('button', { name: /Nueva conversación/ })).not.toBeInTheDocument(),
  )
})
