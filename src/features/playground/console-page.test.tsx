import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { PlaygroundConsolePage } from './console-page'
import { json } from '@/test/tenant-api'
import { sseChannel, type SseChannel } from '@/test/sse'

/**
 * La consola, probada por donde miente si se hace mal: el modo de escritura —que tiene
 * que verse— y el fallo que llega como JSON en vez de como flujo de eventos.
 */

const ORG_ID = '22222222-2222-4222-8222-222222222222'

const ORG = {
  id: ORG_ID,
  name: 'Jardín Infantil Demo',
  status: 'ACTIVE',
  planCode: 'PRO',
  members: 4,
  writable: true,
}

const CONTEXT = {
  organization: ORG,
  model: { provider: 'anthropic', model: 'claude-sonnet-5', source: 'PLATFORM', keyLast4: null },
  systemPrompt: 'Eres Numi.',
  promptHash: 'abc12345',
  promptChars: 11,
  contextBlock: 'Organización: Demo',
  customRoles: [],
  testableProviders: [
    { provider: 'anthropic', label: 'Anthropic', suggestedModels: ['claude-sonnet-5'] },
  ],
}

const TOOLS = [
  {
    name: 'list_receivables',
    description: 'Lista las cuentas por cobrar.',
    kind: 'read',
    permission: 'receivables.read',
    schema: null,
    offered: true,
    withheld: null,
  },
]

const m = vi.hoisted(() => ({
  canal: null as SseChannel | null,
  chatResponse: null as (() => Response) | null,
  context: null as unknown,
  writable: true,
}))

function stubApi() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url)
      if (u.includes('/auth/csrf')) return json({ csrfToken: 'tok' })
      if (u.includes('/playground/chat')) {
        if (m.chatResponse) return m.chatResponse()
        init?.signal?.addEventListener('abort', () => m.canal?.close())
        m.canal = sseChannel()
        return m.canal.response
      }
      if (u.includes('/context')) {
        return json({
          ...(m.context ?? CONTEXT),
          organization: { ...ORG, writable: m.writable },
        })
      }
      if (u.includes('/tools')) return json(TOOLS)
      if (u.includes('/playground/organizations')) {
        return json({ data: [ORG], page: 1, pageSize: 20, total: 1, totalPages: 1 })
      }
      return json({})
    }),
  )
}

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/plataforma/playground?org=${ORG_ID}`]}>
        <PlaygroundConsolePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  m.canal = null
  m.chatResponse = null
  m.context = null
  m.writable = true
  sessionStorage.clear()
  stubApi()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test('la corrida arranca en solo lectura', async () => {
  mount()

  // El modo se lee en la barra de contexto, no dentro de un formulario.
  expect(await screen.findByText('Solo lectura')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Activar escritura' })).toBeInTheDocument()
  expect(screen.queryByText(/Lectura y escritura/i)).not.toBeInTheDocument()
})

test('activar la escritura es una decisión, no un cambio de criterio', async () => {
  /*
    `read_write` escribe de verdad en la contabilidad de un cliente. No se enciende de
    pasada: hay que confirmarlo, y el aviso dice qué implica y que no hay deshacer en
    bloque.
  */
  const user = userEvent.setup()
  mount()

  await user.click(await screen.findByRole('button', { name: 'Activar escritura' }))

  expect(await screen.findByText(/registrar pagos, egresos y contactos de verdad/i)).toBeInTheDocument()
  expect(screen.getByText(/no hay deshacer en bloque/i)).toBeInTheDocument()

  // Y mientras está activo, la barra lo dice en vez de esconderlo.
  await user.click(screen.getByRole('button', { name: 'Activar escritura', hidden: false }))
  expect(await screen.findByText('Lectura y escritura')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Volver a solo lectura' })).toBeInTheDocument()
})

test('una organización que no está activa no ofrece escribir', async () => {
  // El backend responde 403 ORGANIZATION_SUSPENDED; no se ofrece lo que va a fallar (§88.5).
  m.writable = false
  mount()

  await waitFor(() => expect(screen.getByText(/No está activa/i)).toBeInTheDocument())
  expect(screen.queryByRole('button', { name: 'Activar escritura' })).not.toBeInTheDocument()
})

test('lo que falla antes del primer trozo se enseña tal cual lo dice el backend', async () => {
  /*
    Sin proveedor o sin clave, el turno vuelve como JSON con su status. El mensaje dice qué
    variable de entorno falta: traducirlo a «no se pudo contactar a Numi» borra la única
    parte accionable.
  */
  m.chatResponse = () =>
    json({ error: { code: 'VALIDATION', message: 'Falta ANTHROPIC_API_KEY.' } }, 422)
  const user = userEvent.setup()
  mount()

  await user.type(await screen.findByLabelText('Mensaje para Numi'), 'hola')
  await user.keyboard('{Enter}')

  expect(await screen.findByText('Falta ANTHROPIC_API_KEY.')).toBeInTheDocument()
})

test('la traza del turno se abre desde la respuesta', async () => {
  const user = userEvent.setup()
  mount()

  await user.type(await screen.findByLabelText('Mensaje para Numi'), '¿cuánto me deben?')
  await user.keyboard('{Enter}')

  await waitFor(() => expect(m.canal).not.toBeNull())
  const canal = m.canal as SseChannel
  canal.start('s1')
  canal.chunk('Te deben ')
  canal.chunk('$1.000.')
  canal.trace({
    id: 'tr1',
    at: '2026-08-20T10:00:00Z',
    organizationId: ORG_ID,
    userId: 'u1',
    conversationId: 's1',
    kind: 'turn',
    origin: 'playground',
    provider: 'anthropic',
    model: 'claude-sonnet-5',
    source: 'PLATFORM',
    usage: { input: 1200, output: 300, cacheRead: null, cacheWrite: null, noCache: null, reasoning: null },
    costMicroUsd: null,
    ttftMs: 420,
    stepsUsed: 1,
    finishReason: 'stop',
    messageId: 'm1',
    timings: { totalMs: 1000, resolveMs: 20, contextMs: 80, engineMs: 850, toolsMs: 0, persistMs: 30 },
    maxSteps: 6,
    generations: [],
    tools: [],
    grounding: null,
    stopped: false,
    error: null,
    detail: null,
  })
  canal.done('s1', 'Te deben $1.000.')

  /*
    El carril enseña la traza sin abrir nada: es la mitad del rediseño. Antes había que
    abrir un cajón por turno, y el cajón tapaba la respuesta que se estaba juzgando.
  */
  expect(await screen.findByText('Dónde se fue el tiempo')).toBeInTheDocument()
  // El coste sin precio configurado se dice con palabras, no con un cero.
  expect(screen.getAllByText('Sin precio configurado').length).toBeGreaterThan(0)
  // Un token que el proveedor no reportó tampoco es cero.
  expect(screen.getAllByText('sin dato').length).toBeGreaterThan(0)

  // Y la traza larga sigue estando, a un clic.
  await user.click(await screen.findByRole('button', { name: 'Ver la traza completa' }))
  expect(await screen.findByText('El modelo que contestó')).toBeInTheDocument()
})
