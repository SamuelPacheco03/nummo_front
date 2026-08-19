import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { NumiWidget } from './numi-widget'
import { useNumiStore } from './numi-store'
import { json, tenantApiResponse } from '@/test/tenant-api'
import { sseChannel, type SseChannel } from '@/test/sse'

const m = vi.hoisted(() => ({ canal: null as SseChannel | null, abortada: false }))

function stubApi() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url)
      if (u.includes('/assistant/chat/stream')) {
        // Detener es abortar la petición: aquí se anota para poder comprobarlo, porque
        // es lo único que ve el servidor y lo que le hace dejar de gastar tokens.
        init?.signal?.addEventListener('abort', () => {
          m.abortada = true
          m.canal?.close()
        })
        m.canal = sseChannel()
        return m.canal.response
      }
      return tenantApiResponse(u) ?? json({})
    }),
  )
}

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <NumiWidget />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function preguntar(user: ReturnType<typeof userEvent.setup>, texto = 'cuánto me deben') {
  mount()
  await user.click(await screen.findByRole('button', { name: 'Abrir el chat con Numi' }))
  await user.type(screen.getByLabelText('Mensaje para Numi'), texto)
  await user.keyboard('{Enter}')
  await waitFor(() => expect(m.canal).not.toBeNull())
  return m.canal as SseChannel
}

beforeEach(() => {
  m.canal = null
  m.abortada = false
  localStorage.clear()
  stubApi()
  useNumiStore.setState({
    isOpen: false,
    orgId: null,
    sessionId: undefined,
    messages: [],
    error: null,
    hydrated: true,
    historyId: null,
    unread: false,
    pending: false,
    turn: null,
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test('la respuesta se ve llegar por partes, no de golpe', async () => {
  const user = userEvent.setup()
  const sse = await preguntar(user)

  // Turno abierto y ni una palabra todavía: eso es lo que dicen los puntos.
  sse.start('s1')
  expect(await screen.findByText('Numi está escribiendo…')).toBeInTheDocument()

  sse.chunk('Te deben ')
  expect(await screen.findByText(/Te deben/)).toBeInTheDocument()
  // Y los puntos ya no están: la primera palabra los sustituye en el mismo sitio.
  expect(screen.queryByText('Numi está escribiendo…')).not.toBeInTheDocument()

  sse.chunk('$2.350.000')
  sse.done('s1', 'Te deben $2.350.000')

  expect(await screen.findByText(/\$2\.350\.000/)).toBeInTheDocument()
  await waitFor(() => expect(useNumiStore.getState().sessionId).toBe('s1'))
})

test('detener corta el turno y conserva lo que Numi alcanzó a escribir', async () => {
  const user = userEvent.setup()
  const sse = await preguntar(user)

  sse.start('s1')
  sse.chunk('Te deben ')
  await screen.findByText(/Te deben/)

  await user.click(screen.getByRole('button', { name: 'Detener' }))

  // El servidor se entera por el corte de la conexión, que es lo que le hace parar.
  await waitFor(() => expect(m.abortada).toBe(true))

  // Media respuesta leída es historia: no se borra lo que el usuario ya vio.
  expect(screen.getByText(/Te deben/)).toBeInTheDocument()
  await waitFor(() => expect(useNumiStore.getState().pending).toBe(false))
  // Y no se marca como fallo: detener es una decisión, no un error.
  expect(useNumiStore.getState().error).toBeNull()
})

test('detener antes de la primera palabra no deja una burbuja vacía', async () => {
  const user = userEvent.setup()
  const sse = await preguntar(user)

  sse.start('s1')
  await screen.findByText('Numi está escribiendo…')

  await user.click(screen.getByRole('button', { name: 'Detener' }))

  await waitFor(() => expect(useNumiStore.getState().pending).toBe(false))
  expect(screen.queryByText('Numi está escribiendo…')).not.toBeInTheDocument()
  // Queda la pregunta y nada más.
  expect(useNumiStore.getState().messages.map((x) => x.role)).toEqual(['user'])
})

test('detener no pierde la conversación: el siguiente mensaje sigue en la misma', async () => {
  const user = userEvent.setup()
  const sse = await preguntar(user)

  // `start` llega antes que cualquier texto justamente para esto.
  sse.start('s1')
  await screen.findByText('Numi está escribiendo…')
  await user.click(screen.getByRole('button', { name: 'Detener' }))

  /*
    Sin el `sessionId` de `start`, el siguiente mensaje iría sin conversación y el
    backend abriría otra, dejando esta huérfana con una pregunta y ninguna respuesta.
  */
  await waitFor(() => expect(useNumiStore.getState().sessionId).toBe('s1'))
})

test('un fallo a mitad del flujo se lee igual que cualquier otro', async () => {
  const user = userEvent.setup()
  const sse = await preguntar(user)

  sse.start('s1')
  sse.chunk('Te deben ')
  await screen.findByText(/Te deben/)

  // Se acabó la cuota con la respuesta ya empezada. Llega por el evento `error` y no
  // por el status, y aun así tiene que clasificarse igual: mismo mensaje, sin
  // reintentar, y sin dejar media frase de Numi colgando en el hilo.
  sse.fail('LIMIT_EXCEEDED', 'Plan limit reached', {
    limit: 'ai_messages_monthly',
    max: 2000,
    used: 2000,
    period: '2026-08',
  })

  expect(
    await screen.findByText('Llevas 2000 de 2000 mensajes con Numi este mes.'),
  ).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
  expect(screen.queryByText(/Te deben/)).not.toBeInTheDocument()
})
