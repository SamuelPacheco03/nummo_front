import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { NumiWidget } from './numi-widget'
import { useNumiStore } from './numi-store'
import { sseChannel, type SseChannel } from '@/test/sse'

/*
  El chat llega por Server-Sent Events, así que el doble no es «qué contesta Numi» sino
  «cuándo». Estos tests viven precisamente en el rato en que la respuesta viene de
  camino: el panel se cierra, la app se va, el icono avisa.
*/
const m = vi.hoisted(() => ({ canal: null as SseChannel | null, llamadas: 0 }))

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
vi.mock('@/api/generated/endpoints/assistant/assistant', () => ({
  usePostApiV1OrganizationsOrgIdAssistantChatAudio: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
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

beforeEach(() => {
  m.canal = null
  m.llamadas = 0
  localStorage.clear()
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const u = String(url)
      if (u.includes('/auth/csrf')) {
        return new Response(JSON.stringify({ csrfToken: 'tok' }), {
          headers: { 'content-type': 'application/json' },
        })
      }
      if (u.includes('/assistant/chat/stream')) {
        m.llamadas++
        // Se abre y no se contesta: cada test decide cuándo llega la respuesta.
        m.canal = sseChannel()
        return m.canal.response
      }
      return new Response('{}', { headers: { 'content-type': 'application/json' } })
    }),
  )
  useNumiStore.setState({
    isOpen: false,
    orgId: null,
    sessionId: undefined,
    messages: [],
    error: null,
    hydrated: false,
    unread: false,
    pending: false,
  })
})
/** Numi contesta el turno abierto: la conversación, el texto y el cierre. */
function contesta(texto: string, sessionId = 's1') {
  const canal = m.canal
  if (!canal) throw new Error('no hay turno en curso')
  canal.start(sessionId)
  canal.chunk(texto)
  canal.done(sessionId, texto)
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test('lo enviado sigue ahí al cerrar y volver a abrir el chat', async () => {
  const user = userEvent.setup()
  pintar()
  useNumiStore.getState().open()

  const caja = await screen.findByLabelText('Mensaje para Numi')
  await user.type(caja, 'cuánto me deben')
  await user.keyboard('{Enter}')
  expect(await screen.findByText('cuánto me deben')).toBeInTheDocument()

  // Se cierra el chat con la respuesta todavía en camino.
  await user.click(screen.getByRole('button', { name: /cerrar/i }))
  expect(screen.queryByText('cuánto me deben')).not.toBeInTheDocument()

  // Numi contesta mientras el panel está cerrado.
  contesta('Te deben $2.350.000')

  useNumiStore.getState().open()
  expect(await screen.findByText('cuánto me deben')).toBeInTheDocument()
  await waitFor(() => expect(screen.getByText(/Te deben/)).toBeInTheDocument())
})

test('el hilo se guarda: volver a la app no es empezar de cero', async () => {
  const user = userEvent.setup()
  pintar()
  useNumiStore.getState().open()

  await user.type(await screen.findByLabelText('Mensaje para Numi'), 'hola')
  await user.keyboard('{Enter}')
  contesta('Hola, ¿en qué te ayudo?')
  await screen.findByText('Hola, ¿en qué te ayudo?')

  /*
    Lo que hace el móvil al salir de la app: descarta la página. Lo único que
    sobrevive es lo guardado, así que se aparta antes de vaciar el store —que
    al vaciarse vuelve a guardar— y se devuelve como lo encontraría el arranque.
  */
  const guardado = localStorage.getItem('nummo-numi')
  expect(guardado).toContain('hola')
  cleanup()
  useNumiStore.setState({ isOpen: false, orgId: null, sessionId: undefined, messages: [], hydrated: false })
  localStorage.setItem('nummo-numi', guardado!)
  await useNumiStore.persist.rehydrate()

  expect(useNumiStore.getState().messages.map((x) => x.content)).toEqual([
    'hola',
    'Hola, ¿en qué te ayudo?',
  ])
  expect(useNumiStore.getState().sessionId).toBe('s1')
})

test('si Numi contesta con el chat cerrado, el icono lo dice', async () => {
  const user = userEvent.setup()
  pintar()
  useNumiStore.getState().open()

  await user.type(await screen.findByLabelText('Mensaje para Numi'), 'hola')
  await user.keyboard('{Enter}')
  await user.click(screen.getByRole('button', { name: /cerrar/i }))

  expect(screen.getByRole('button', { name: 'Abrir el chat con Numi' })).toBeInTheDocument()
  contesta('Hola')

  // El aviso vive en el icono de Numi: la respuesta está en el chat, y el
  // sitio donde se dice es al que hay que ir.
  expect(
    await screen.findByRole('button', { name: 'Abrir el chat con Numi · respuesta nueva' }),
  ).toBeInTheDocument()

  // Y se apaga al abrir, sin más ceremonia.
  await user.click(screen.getByRole('button', { name: /respuesta nueva/ }))
  expect(useNumiStore.getState().unread).toBe(false)
})

/** jsdom no tiene micrófono: se finge uno que graba y devuelve un blob. */
function stubRecorder() {
  const track = { stop: vi.fn() }
  vi.stubGlobal(
    'MediaRecorder',
    class {
      static isTypeSupported = () => true
      state = 'inactive'
      stream = { getTracks: () => [track] }
      mimeType = 'audio/webm'
      ondataavailable: ((e: { data: Blob }) => void) | null = null
      onstop: (() => void) | null = null
      start() {
        this.state = 'recording'
        this.ondataavailable?.({ data: new Blob(['x'], { type: 'audio/webm' }) })
      }
      stop() {
        this.state = 'inactive'
        this.onstop?.()
      }
    },
  )
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [track] }) },
  })
  return track
}

test('con el panel abierto, sostener el micrófono no cancela la grabación', async () => {
  const track = stubRecorder()
  vi.stubGlobal(
    'matchMedia',
    vi.fn((q: string) => ({
      matches: q.includes('coarse'),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
  pintar()
  useNumiStore.getState().open()

  const mic = await screen.findByRole('button', { name: /mantén pulsado/i })
  mic.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 200, clientY: 700 }))
  expect(await screen.findByText('Desliza para cancelar')).toBeInTheDocument()

  // Un segundo sosteniendo, sin mover un dedo, y con todo el panel montado
  // alrededor: el hilo, la cola y lo que sea que se refresque solo.
  await new Promise((r) => setTimeout(r, 1200))

  expect(screen.getByText('Desliza para cancelar')).toBeInTheDocument()
  expect(track.stop).not.toHaveBeenCalled()
})
