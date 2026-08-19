import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { NumiWidget } from './numi-widget'
import { useNumiStore } from './numi-store'

const m = vi.hoisted(() => ({ enviados: [] as string[] }))

vi.mock('@/features/organizations/hooks', () => ({
  useCurrentOrg: () => ({ orgId: 'o1', role: 'OWNER', organization: { name: 'Demo' } }),
}))
vi.mock('./use-numi-history', () => ({
  useNumiConversations: () => ({ conversations: [], isLoading: false }),
  useNumiMessages: () => ({ messages: [], older: [], isLoading: false, hasOlder: false }),
  useMessageAudioLoader: () => undefined,
  useConversationOpener: () => async () => [],
  useConversationActions: () => ({ rename: vi.fn(), remove: vi.fn() }),
  useMessageRating: () => vi.fn(),
  useNewerMessages: () => async () => [],
}))
vi.mock('./stream-chat', () => ({
  streamChat: vi.fn(async ({ message }: { message: string }) => {
    m.enviados.push(message)
    return { sessionId: 's1', reply: 'ok' }
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

/**
 * Abre el menú del mensaje y elige una acción.
 *
 * En escritorio las acciones no están sueltas al lado de cada burbuja: viven detrás del
 * chevron de su esquina, que es lo que evita que un hilo largo se llene de iconos.
 */
async function elegir(user: ReturnType<typeof userEvent.setup>, accion: string) {
  await user.click(await screen.findByRole('button', { name: 'Opciones del mensaje' }))
  await user.click(await screen.findByRole('menuitem', { name: accion }))
}

/** Siembra el hilo con una respuesta de Numi ya entregada. */
function sembrar() {
  useNumiStore.setState({
    isOpen: true,
    orgId: 'o1',
    sessionId: 's1',
    hydrated: true,
    historyId: null,
    messages: [
      {
        id: 'm1',
        role: 'assistant',
        content: 'Ana Torres te debe 120.000 pesos.',
        at: new Date().toISOString(),
      },
    ],
  })
}

beforeEach(() => {
  m.enviados = []
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

test('copiar se lleva la respuesta entera, que es donde están las cifras', async () => {
  const user = userEvent.setup()
  pintar()
  sembrar()

  await elegir(user, 'Copiar')

  // El portapapeles es el que `userEvent` monta, así que se comprueba lo que quedó
  // dentro y no una llamada espiada: importa el texto, no que se llamara a la API.
  await waitFor(async () =>
    expect(await navigator.clipboard.readText()).toBe('Ana Torres te debe 120.000 pesos.'),
  )
})

test('citar no manda nada todavía: prepara la pregunta', async () => {
  const user = userEvent.setup()
  pintar()
  sembrar()

  await elegir(user, 'Citar')

  // La cita se ve encima de la caja, y hasta ahí. Nada ha salido.
  expect(await screen.findByText(/Ana Torres te debe/, { selector: 'p.italic' })).toBeInTheDocument()
  expect(m.enviados).toEqual([])
})

test('la cita viaja con la pregunta, para que Numi sepa de qué se le habla', async () => {
  const user = userEvent.setup()
  pintar()
  sembrar()

  await elegir(user, 'Citar')
  await user.type(screen.getByLabelText('Mensaje para Numi'), '¿de dónde sale?')
  await user.keyboard('{Enter}')

  await waitFor(() => expect(m.enviados).toHaveLength(1))
  expect(m.enviados[0]).toBe('> Ana Torres te debe 120.000 pesos.\n\n¿de dónde sale?')
  // Y al salir se va con ella: la siguiente pregunta no arrastra la cita anterior.
  expect(screen.queryByText(/Ana Torres te debe/, { selector: 'p.italic' })).not.toBeInTheDocument()
})

test('quitar la cita no borra lo que ya se había escrito', async () => {
  const user = userEvent.setup()
  pintar()
  sembrar()

  await elegir(user, 'Citar')
  await user.type(screen.getByLabelText('Mensaje para Numi'), 'una pregunta')
  await user.click(screen.getByRole('button', { name: 'Quitar la cita' }))

  /*
    Es la razón de que la cita viaje aparte del texto: si fuera parte de lo escrito,
    quitarla obligaría a adivinar dónde acaba la cita y empieza la pregunta.
  */
  expect(screen.getByLabelText('Mensaje para Numi')).toHaveValue('una pregunta')
  // Y el foco vuelve solo a la caja: se sigue escribiendo sin tener que pulsarla.
  expect(screen.getByLabelText('Mensaje para Numi')).toHaveFocus()
  await user.keyboard('{Enter}')
  await waitFor(() => expect(m.enviados).toEqual(['una pregunta']))
})

test('lo dictado no ofrece copiar: de una nota de voz lo que hay es audio', async () => {
  pintar()
  useNumiStore.setState({
    isOpen: true,
    orgId: 'o1',
    hydrated: true,
    messages: [
      {
        id: 'a1',
        role: 'user',
        content: 'cuánto me debe Ana',
        at: new Date().toISOString(),
        dictated: true,
        hasAudio: true,
        audioUrl: 'blob:x',
      },
    ],
  })

  // Ni siquiera se le pone el chevron: de una nota de voz no hay texto que copiar.
  const hilo = await screen.findByRole('log')
  expect(within(hilo).queryByRole('button', { name: 'Opciones del mensaje' })).not.toBeInTheDocument()
})
