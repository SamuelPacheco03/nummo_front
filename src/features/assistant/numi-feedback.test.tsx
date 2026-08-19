import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { NumiWidget } from './numi-widget'
import { useNumiStore } from './numi-store'

const m = vi.hoisted(() => ({
  enviados: [] as { messageId: string; feedback: string | null }[],
  falla: false,
}))

vi.mock('@/features/organizations/hooks', () => ({
  useCurrentOrg: () => ({ orgId: 'o1', role: 'OWNER', organization: { name: 'Demo' } }),
}))
vi.mock('./use-numi-history', () => ({
  useNumiConversations: () => ({ conversations: [], isLoading: false }),
  useNumiMessages: () => ({ messages: [], older: [], isLoading: false, hasOlder: false }),
  useMessageAudioLoader: () => undefined,
  useConversationOpener: () => async () => [],
  useConversationActions: () => ({ rename: vi.fn(), remove: vi.fn() }),
  useMessageSearch: () => ({ hits: [], isSearching: false, enabled: false }),
  useMessageRating: () => async (messageId: string, feedback: string | null) => {
    if (m.falla) throw new Error('no se pudo');
    m.enviados.push({ messageId, feedback })
  },
}))
vi.mock('./stream-chat', () => ({ streamChat: vi.fn(async () => ({ sessionId: 's1', reply: 'ok' })) }))

function pintar() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <NumiWidget />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** Un hilo con una pregunta tuya y una respuesta de Numi. */
function sembrar() {
  useNumiStore.setState({
    isOpen: true,
    orgId: 'o1',
    sessionId: 'c1',
    hydrated: true,
    historyId: 'c1',
    messages: [
      { id: 'mia', role: 'user', content: 'cuánto me debe Ana', at: '2026-08-18T10:00:00.000Z' },
      {
        id: 'suya',
        role: 'assistant',
        content: 'Ana Torres te debe $120.000.',
        at: '2026-08-18T10:00:05.000Z',
      },
    ],
  })
}

const opinion = () => useNumiStore.getState().messages.find((x) => x.id === 'suya')?.feedback

beforeEach(() => {
  m.enviados = []
  m.falla = false
  localStorage.clear()
  useNumiStore.setState({
    isOpen: false,
    orgId: null,
    sessionId: undefined,
    messages: [],
    error: null,
    hydrated: false,
    historyId: null,
    historyUntil: null,
    unread: false,
    pending: false,
  })
})
afterEach(cleanup)

test('solo las respuestas de Numi se puntúan', async () => {
  pintar()
  sembrar()

  const hilo = await screen.findByRole('log')
  // Una por respuesta de Numi, y ninguna sobre lo que escribiste tú.
  expect(within(hilo).getAllByRole('button', { name: 'Buena respuesta' })).toHaveLength(1)
  expect(within(hilo).getAllByRole('button', { name: 'Mala respuesta' })).toHaveLength(1)
})

test('el pulgar se marca al instante y se manda al servidor', async () => {
  const user = userEvent.setup()
  pintar()
  sembrar()

  await user.click(await screen.findByRole('button', { name: 'Buena respuesta' }))

  // Es una opinión, no una operación: se pinta sin esperar al viaje de ida y vuelta.
  expect(opinion()).toBe('up')
  expect(screen.getByRole('button', { name: 'Buena respuesta' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await waitFor(() => expect(m.enviados).toEqual([{ messageId: 'suya', feedback: 'up' }]))
})

test('volver a pulsar el mismo pulgar retira la opinión', async () => {
  const user = userEvent.setup()
  pintar()
  sembrar()

  await user.click(await screen.findByRole('button', { name: 'Buena respuesta' }))
  await user.click(screen.getByRole('button', { name: 'Buena respuesta' }))

  expect(opinion()).toBeUndefined()
  // Retirar es mandar null, no dejar de mandar nada.
  await waitFor(() => expect(m.enviados.at(-1)).toEqual({ messageId: 'suya', feedback: null }))
})

test('cambiar de opinión sustituye la anterior', async () => {
  const user = userEvent.setup()
  pintar()
  sembrar()

  await user.click(await screen.findByRole('button', { name: 'Buena respuesta' }))
  await user.click(screen.getByRole('button', { name: 'Mala respuesta' }))

  expect(opinion()).toBe('down')
  await waitFor(() => expect(m.enviados.at(-1)).toEqual({ messageId: 'suya', feedback: 'down' }))
})

test('si el servidor la rechaza, el pulgar se deshace', async () => {
  /*
    Una opinión que se ve guardada y no lo está es peor que no poder darla: el usuario
    creería que ya avisó de que la respuesta era mala.
  */
  const user = userEvent.setup()
  m.falla = true
  pintar()
  sembrar()

  await user.click(await screen.findByRole('button', { name: 'Mala respuesta' }))

  await waitFor(() => expect(opinion()).toBeUndefined())
  expect(screen.getByRole('button', { name: 'Mala respuesta' })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
})
