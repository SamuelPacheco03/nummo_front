import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { NumiWidget } from './numi-widget'
import { isServerId, useNumiStore } from './numi-store'

const SERVER_ID = '019ff9d5-9390-78c4-a287-1fc8019fd4f3'
const OTRO_ID = '019ff9d5-9390-78c4-a287-1fc8019fd4f4'

const m = vi.hoisted(() => ({
  /** Con qué `after` se preguntó por novedades. */
  preguntas: [] as { conversationId: string; after: string }[],
  nuevos: [] as { id: string; role: 'user' | 'assistant'; content: string; at: string }[],
}))

vi.mock('@/features/organizations/hooks', () => ({
  useCurrentOrg: () => ({ orgId: 'o1', role: 'OWNER', organization: { name: 'Demo' } }),
}))
vi.mock('./stream-chat', () => ({ streamChat: vi.fn() }))
vi.mock('./use-numi-history', () => ({
  useNumiConversations: () => ({ conversations: [], isLoading: false }),
  useNumiMessages: () => ({ messages: [], older: [], isLoading: false, hasOlder: false }),
  useMessageAudioLoader: () => undefined,
  useConversationOpener: () => async () => [],
  useConversationActions: () => ({ rename: vi.fn(), remove: vi.fn() }),
  useMessageSearch: () => ({ hits: [], isSearching: false, enabled: false }),
  useMessageRating: () => vi.fn(),
  useNewerMessages: () => async (conversationId: string, after: string) => {
    m.preguntas.push({ conversationId, after })
    return m.nuevos
  },
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

const abrirCon = (messages: { id: string; role: 'user' | 'assistant'; content: string; at: string }[]) =>
  useNumiStore.setState({
    isOpen: true,
    orgId: 'o1',
    sessionId: 'c1',
    hydrated: true,
    historyId: 'c1',
    messages,
  })

const mensaje = (id: string, content: string) => ({
  id,
  role: 'assistant' as const,
  content,
  at: '2026-08-19T10:00:00.000Z',
})

beforeEach(() => {
  m.preguntas = []
  m.nuevos = []
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

describe('qué id se le pregunta al servidor', () => {
  test('solo los que el servidor podría conocer', () => {
    /*
      La versión fácil —«no empieza por el prefijo del cliente»— falla con cualquier id que
      no encaje en ninguno de los dos moldes: se daría por bueno y se le pediría al
      servidor «qué hay después de esto», que responde con todo lo que ya se tenía.
    */
    expect(isServerId(SERVER_ID)).toBe(true)
    expect(isServerId('numi-3')).toBe(false)
    expect(isServerId('cualquier-cosa')).toBe(false)
  })
})

describe('ponerse al día', () => {
  test('al abrir el panel se pregunta por lo dicho mientras estaba cerrado', async () => {
    m.nuevos = [mensaje(OTRO_ID, 'esto lo escribí en el móvil')]
    pintar()
    abrirCon([mensaje(SERVER_ID, 'lo último que tenía')])

    // Mientras el chat está cerrado no hay flujo abierto, así que los avisos de ese rato
    // no llegaron a ninguna parte: al abrir hay que preguntar.
    await waitFor(() => expect(m.preguntas).toHaveLength(1))
    expect(m.preguntas[0]).toEqual({ conversationId: 'c1', after: SERVER_ID })
    expect(await screen.findByText('esto lo escribí en el móvil')).toBeInTheDocument()
  })

  test('lo que llega se añade por el final, sin repetir lo que ya estaba', async () => {
    // El caso normal: el aviso es del propio mensaje que se acaba de mandar, y lo que
    // vuelve ya está en el hilo.
    m.nuevos = [mensaje(SERVER_ID, 'lo último que tenía'), mensaje(OTRO_ID, 'lo nuevo')]
    pintar()
    abrirCon([mensaje(SERVER_ID, 'lo último que tenía')])

    await waitFor(() => expect(useNumiStore.getState().messages).toHaveLength(2))
    expect(useNumiStore.getState().messages.map((x) => x.content)).toEqual([
      'lo último que tenía',
      'lo nuevo',
    ])
  })

  test('con un mensaje todavía en vuelo se pregunta por el último que el servidor sí tiene', async () => {
    /*
      Un mensaje enviado lleva un id de cliente hasta que el servidor le da el suyo.
      Preguntar «qué hay después» con ese id sería preguntar por algo que no existe allí.
    */
    pintar()
    abrirCon([
      mensaje(SERVER_ID, 'archivado'),
      { id: 'numi-7', role: 'user', content: 'recién enviado', at: '2026-08-19T10:00:01.000Z' },
    ])

    await waitFor(() => expect(m.preguntas).toHaveLength(1))
    expect(m.preguntas[0]?.after).toBe(SERVER_ID)
  })

  test('sin ningún id del servidor no se pregunta nada', async () => {
    // Conversación estrenada en esta pantalla: no hay nada archivado por lo que preguntar.
    pintar()
    abrirCon([{ id: 'numi-1', role: 'user', content: 'hola', at: '2026-08-19T10:00:00.000Z' }])

    await new Promise((r) => setTimeout(r, 50))
    expect(m.preguntas).toEqual([])
  })
})

describe('adoptar el id del servidor', () => {
  test('el mensaje deja de llamarse por el id que inventó el cliente', () => {
    abrirCon([{ id: 'numi-1', role: 'user', content: 'hola', at: '2026-08-19T10:00:00.000Z' }])

    useNumiStore.getState().adoptServerId('numi-1', SERVER_ID)

    expect(useNumiStore.getState().messages.map((x) => x.id)).toEqual([SERVER_ID])
  })

  test('si el servidor ya lo había mandado por otra vía, no quedan dos', () => {
    /*
      Es la carrera real: el aviso de tu propio mensaje puede llegar antes de que termine
      la petición que lo envió. Sin esto, el hilo mostraría el mismo mensaje dos veces.
    */
    abrirCon([
      mensaje(SERVER_ID, 'hola'),
      { id: 'numi-1', role: 'user', content: 'hola', at: '2026-08-19T10:00:00.000Z' },
    ])

    useNumiStore.getState().adoptServerId('numi-1', SERVER_ID)

    expect(useNumiStore.getState().messages).toHaveLength(1)
    expect(useNumiStore.getState().messages[0]?.id).toBe(SERVER_ID)
  })
})
