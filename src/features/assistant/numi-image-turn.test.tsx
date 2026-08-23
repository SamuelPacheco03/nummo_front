import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { NumiWidget } from './numi-widget'
import { useNumiStore } from './numi-store'
import { json, tenantApiResponse } from '@/test/tenant-api'
import { sseChannel, type SseChannel } from '@/test/sse'

/**
 * **Un turno con foto es un turno como los demás.**
 *
 * Va por `/assistant/chat/image/stream`, que habla el mismo idioma de eventos que el
 * chat de texto: `start` dice «ya la tengo» —y ahí caen las dos palomitas, sin esperar
 * a que el modelo la lea—, los `chunk` escriben la respuesta a la vista y `done` cierra.
 * Lo único distinto es que el cuerpo es multipart.
 */
const m = vi.hoisted(() => ({
  canal: null as SseChannel | null,
  ruta: '',
  cuerpo: null as unknown,
  cabeceras: null as Headers | null,
  abortada: false,
}))

function stubApi() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url)
      if (u.includes('/assistant/chat/image/stream')) {
        m.ruta = u
        m.cuerpo = init?.body
        m.cabeceras = new Headers(init?.headers)
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

/** jsdom no crea `blob:`; la burbuja solo necesita que la URL exista. */
function stubObjectUrl() {
  URL.createObjectURL = vi.fn(() => 'blob:foto')
  URL.revokeObjectURL = vi.fn()
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

const FOTO = new File(['x'], 'comprobante.png', { type: 'image/png' })

/** Abre el chat, adjunta la foto y la manda. Devuelve el flujo ya abierto. */
async function mandarFoto(user: ReturnType<typeof userEvent.setup>, texto?: string) {
  mount()
  await user.click(await screen.findByRole('button', { name: 'Abrir el chat con Numi' }))

  const input = document.querySelector('input[type="file"]')
  if (!input) throw new Error('el compositor no trae input de archivo')
  fireEvent.change(input, { target: { files: [FOTO] } })
  if (texto) await user.type(screen.getByLabelText('Mensaje para Numi'), texto)

  await user.click(await screen.findByRole('button', { name: 'Enviar mensaje' }))
  await waitFor(() => expect(m.canal).not.toBeNull())
  return m.canal as SseChannel
}

beforeEach(() => {
  m.canal = null
  m.ruta = ''
  m.cuerpo = null
  m.cabeceras = null
  m.abortada = false
  localStorage.clear()
  stubApi()
  stubObjectUrl()
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

test('la foto viaja como multipart, y el navegador pone el `boundary`', async () => {
  const user = userEvent.setup()
  await mandarFoto(user, 'de cuánto es')

  expect(m.ruta).toContain('/assistant/chat/image/stream')
  expect(m.cuerpo).toBeInstanceOf(FormData)
  const form = m.cuerpo as FormData
  expect(form.get('image')).toBe(FOTO)
  expect(form.get('message')).toBe('de cuánto es')
  // Etiquetarlo a mano lo dejaría sin el `boundary` del multipart.
  expect(m.cabeceras?.get('content-type')).toBeNull()
})

test('`start` entrega la foto aunque la conversación todavía no exista', async () => {
  const user = userEvent.setup()
  const sse = await mandarFoto(user)

  // Antes de `start` la foto va en camino: una palomita.
  expect(await screen.findByRole('img', { name: 'Enviado' })).toBeInTheDocument()

  /*
    El turno nace de esta misma imagen, así que `sessionId` viene null: el id lo crea el
    turno de chat, que es posterior a la lectura. Aun así la foto ya está archivada, y
    eso es lo que dicen las dos palomitas.
  */
  sse.start(null, { documentId: 'doc-1', alreadyFiled: false })

  expect(await screen.findByRole('img', { name: 'Entregado' })).toBeInTheDocument()
  // Y Numi todavía no ha dicho nada: la espera se cuenta con los puntos.
  expect(screen.getByText('Numi está escribiendo…')).toBeInTheDocument()
})

test('la respuesta se escribe a la vista, no cae de golpe', async () => {
  const user = userEvent.setup()
  const sse = await mandarFoto(user)
  sse.start(null, { documentId: 'doc-1' })

  sse.chunk('Es una factura de ')
  expect(await screen.findByText(/Es una factura de/)).toBeInTheDocument()
  expect(screen.queryByText('Numi está escribiendo…')).not.toBeInTheDocument()

  sse.chunk('$120.000')
  sse.done('s1', 'Es una factura de $120.000', false, { documentId: 'doc-1' })

  expect(await screen.findByText(/\$120\.000/)).toBeInTheDocument()
  await waitFor(() => expect(useNumiStore.getState().sessionId).toBe('s1'))
  // El documento queda atado al mensaje: es lo que repinta la miniatura al volver.
  await waitFor(() => {
    const foto = useNumiStore.getState().messages.find((msg) => msg.imageUrl)
    expect(foto?.documentIds).toEqual(['doc-1'])
  })
})

test('detener antes de que llegue la marca como no enviada', async () => {
  const user = userEvent.setup()
  await mandarFoto(user)

  // Sin `start` la imagen no llegó a archivarse: no hay nada que conservar.
  await user.click(screen.getByRole('button', { name: 'Detener la respuesta' }))

  expect(m.abortada).toBe(true)
  expect(await screen.findByText('No se envió')).toBeInTheDocument()
})

test('detener después de `start` conserva lo que Numi alcanzó a escribir', async () => {
  const user = userEvent.setup()
  const sse = await mandarFoto(user)
  sse.start(null, { documentId: 'doc-1' })
  sse.chunk('Es una factura de ')
  expect(await screen.findByText(/Es una factura de/)).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Detener la respuesta' }))

  // La foto llegó —dos palomitas— y media respuesta es media respuesta, no un fallo.
  expect(await screen.findByRole('img', { name: 'Entregado' })).toBeInTheDocument()
  expect(screen.getByText(/Es una factura de/)).toBeInTheDocument()
  expect(screen.queryByText('No se envió')).not.toBeInTheDocument()
})

test('lo escrito junto a la foto se ve en su burbuja', async () => {
  const user = userEvent.setup()
  await mandarFoto(user, 'de cuánto es')

  const hilo = screen.getByRole('log')
  expect(within(hilo).getByText('de cuánto es')).toBeInTheDocument()
  expect(within(hilo).getByAltText('Imagen enviada a Numi')).toBeInTheDocument()
})
