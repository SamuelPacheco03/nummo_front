import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { NumiWidget } from './numi-widget'
import { useNumiStore } from './numi-store'

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
  useNewerMessages: () => async () => [],
  useMessageRating: () => vi.fn(),
}))
vi.mock('./stream-chat', () => ({ streamChat: vi.fn() }))

/** Un teléfono: puntero grueso y sin «encima». */
function fingirDedo() {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('coarse'),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
}

function pintar() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <NumiWidget />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  // Con temporizadores falsos nada flushea solo: sembrar fuera de `act` deja el panel
  // sin repintar y el mensaje no llega al DOM.
  act(() => {
    useNumiStore.setState({
      isOpen: true,
      orgId: 'o1',
      sessionId: 'c1',
      hydrated: true,
      historyId: 'c1',
      messages: [
        {
          id: 'suya',
          role: 'assistant',
          content: 'Ana Torres tiene saldo pendiente',
          at: '2026-08-19T10:00:00.000Z',
        },
      ],
    })
  })
}

/** Mantener pulsado sobre el mensaje, como en WhatsApp. */
function mantenerPulsado(elemento: HTMLElement, ms = 600) {
  fireEvent.pointerDown(elemento, { clientX: 10, clientY: 10 })
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  fingirDedo()
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

afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

test('con el dedo no hay chevron: las acciones salen al seleccionar', () => {
  pintar()

  // El menú de la esquina es de escritorio: aparece «al pasar por encima», y con el dedo
  // no existe ese momento.
  expect(screen.queryByRole('button', { name: 'Opciones del mensaje' })).not.toBeInTheDocument()
})

test('mantener pulsado selecciona el mensaje y saca sus acciones arriba', () => {
  pintar()

  mantenerPulsado(screen.getByText('Ana Torres tiene saldo pendiente'))

  // La cabecera pasa a ser barra de acciones, como en WhatsApp.
  expect(screen.getByText('1 seleccionado')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Copiar mensaje' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Citar mensaje' })).toBeInTheDocument()
  // Y los pulgares aparecen sobre el mensaje, que es donde caben en una pantalla estrecha.
  expect(screen.getByRole('button', { name: 'Buena respuesta' })).toBeInTheDocument()
})

test('soltar antes de tiempo no selecciona nada', () => {
  pintar()
  const burbuja = screen.getByText('Ana Torres tiene saldo pendiente')

  fireEvent.pointerDown(burbuja, { clientX: 10, clientY: 10 })
  act(() => {
    vi.advanceTimersByTime(200)
  })
  fireEvent.pointerUp(burbuja)
  act(() => {
    vi.advanceTimersByTime(600)
  })

  expect(screen.queryByText('1 seleccionado')).not.toBeInTheDocument()
})

test('mover el dedo cancela: desplazar el hilo no es seleccionar', () => {
  /*
    Es la diferencia entre leer y elegir. Sin esto, cualquier scroll con el dedo apoyado
    en una burbuja acabaría seleccionándola.
  */
  pintar()
  const burbuja = screen.getByText('Ana Torres tiene saldo pendiente')

  fireEvent.pointerDown(burbuja, { clientX: 10, clientY: 10 })
  fireEvent.pointerMove(burbuja, { clientX: 10, clientY: 80 })
  act(() => {
    vi.advanceTimersByTime(600)
  })

  expect(screen.queryByText('1 seleccionado')).not.toBeInTheDocument()
})

test('la selección se quita, y se quita sola al actuar', () => {
  pintar()
  mantenerPulsado(screen.getByText('Ana Torres tiene saldo pendiente'))

  fireEvent.click(screen.getByRole('button', { name: 'Quitar la selección' }))

  expect(screen.queryByText('1 seleccionado')).not.toBeInTheDocument()
  // Y la cabecera vuelve a ser la de siempre.
  expect(screen.getByRole('button', { name: 'Ver mis conversaciones' })).toBeInTheDocument()
})
