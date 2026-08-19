import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { NumiWidget } from './numi-widget'
import { useNumiStore } from './numi-store'

/*
  Aquí no se mockean los hooks del historial, solo los endpoints: lo que se está
  probando es justamente el camino entre la respuesta paginada y el hilo pintado
  —qué página se mezcla, cuál no y en qué orden—, y un doble del hook lo saltaría
  entero.
*/
const m = vi.hoisted(() => ({ paginas: 0 }))

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
    Promise.resolve({ data: { items: [{ id: 'c1', title: 'Cartera', messageCount: 3 }], nextCursor: null } }),
  getApiV1OrganizationsOrgIdAssistantConversationsIdMessages: (
    _orgId: string,
    _id: string,
    params: { before?: string },
  ) => {
    m.paginas++
    // Las páginas llegan de la más nueva a la más vieja, y cada una viene del
    // revés: es el scroll hacia arriba de WhatsApp.
    return Promise.resolve(
      params.before
        ? { data: { items: [mensaje('m1', 'lo de la semana pasada')], nextCursor: null } }
        : {
            data: {
              items: [mensaje('m3', 'y el saldo de hoy'), mensaje('m2', 'lo de ayer')],
              nextCursor: 'm2',
            },
          },
    )
  },
  getApiV1OrganizationsOrgIdAssistantConversationsIdMessagesMessageIdAudio: vi.fn(),
  usePutApiV1OrganizationsOrgIdAssistantConversationsIdMessagesMessageIdFeedback: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
  usePostApiV1OrganizationsOrgIdAssistantChat: () => ({ isPending: false, mutateAsync: vi.fn() }),
  usePostApiV1OrganizationsOrgIdAssistantChatAudio: () => ({ isPending: false, mutateAsync: vi.fn() }),
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

beforeEach(() => {
  m.paginas = 0
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

test('subir en el hilo trae la conversación anterior, y la pone por encima', async () => {
  const user = userEvent.setup()
  pintar()
  useNumiStore.getState().open()

  // Al abrir se siembra con la última página: lo más reciente, abajo.
  expect(await screen.findByText('lo de ayer')).toBeInTheDocument()
  expect(screen.getByText('y el saldo de hoy')).toBeInTheDocument()
  expect(screen.queryByText('lo de la semana pasada')).not.toBeInTheDocument()

  await user.click(await screen.findByRole('button', { name: 'Ver mensajes anteriores' }))

  expect(await screen.findByText('lo de la semana pasada')).toBeInTheDocument()
  // Y el orden es el de la conversación, no el de llegada.
  expect(useNumiStore.getState().messages.map((x) => x.content)).toEqual([
    'lo de la semana pasada',
    'lo de ayer',
    'y el saldo de hoy',
  ])
})

test('cuando ya no queda nada arriba, el aviso desaparece', async () => {
  const user = userEvent.setup()
  pintar()
  useNumiStore.getState().open()

  await user.click(await screen.findByRole('button', { name: 'Ver mensajes anteriores' }))
  await screen.findByText('lo de la semana pasada')

  expect(screen.queryByRole('button', { name: 'Ver mensajes anteriores' })).not.toBeInTheDocument()
})

test('una conversación estrenada no pide una página que no existe', async () => {
  const user = userEvent.setup()
  pintar()
  useNumiStore.getState().open()
  await screen.findByText('lo de ayer')
  const alHidratar = m.paginas

  await user.click(screen.getByRole('button', { name: 'Nueva conversación' }))

  /*
    Es la diferencia entre `sessionId` e `historyId`: en cuanto Numi conteste esta
    conversación tendrá id, pero todo lo suyo está a la vista. Preguntar por su
    historia sería una petición garantizada a devolver nada.
  */
  expect(screen.queryByRole('button', { name: 'Ver mensajes anteriores' })).not.toBeInTheDocument()
  expect(m.paginas).toBe(alHidratar)
})

test('lo escrito antes de que llegara el historial no se duplica al traer lo anterior', async () => {
  const user = userEvent.setup()
  /*
    El caso que obliga a NO mezclar la primera página. Un mensaje enviado vive en
    el hilo con un id de cliente hasta que el servidor le da el suyo; si la app se
    cerró antes de esa respuesta, al volver hay dos copias del mismo mensaje que no
    se reconocen entre sí. La primera página es justo la que las contiene, así que
    se deja fuera: de la segunda en adelante son mensajes estrictamente más viejos.
  */
  useNumiStore.setState({
    orgId: 'o1',
    sessionId: 'c1',
    messages: [{ id: 'local-1', role: 'user', content: 'lo de ayer', at: '2026-08-16T00:00:00.000Z' }],
  })
  pintar()
  useNumiStore.getState().open()

  await user.click(await screen.findByRole('button', { name: 'Ver mensajes anteriores' }))
  await screen.findByText('lo de la semana pasada')

  expect(screen.getAllByText('lo de ayer')).toHaveLength(1)
  expect(useNumiStore.getState().messages.map((x) => x.content)).toEqual([
    'lo de la semana pasada',
    'lo de ayer',
  ])
})
