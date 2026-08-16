import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { NumiWidget } from './numi-widget'
import { useNumiStore } from './numi-store'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

const ORG = {
  organization: { id: '11111111-1111-4111-8111-111111111111', name: 'Demo', type: 'GENERIC' },
  role: 'OWNER',
}

/** `fetch` con la lista de organizaciones y el chat; `onChat` decide la respuesta. */
function stubApi(onChat: (message: string) => Promise<Response>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url)
      if (u.includes('/auth/csrf')) return json({ csrfToken: 'tok' })
      if (u.includes('/assistant/chat')) {
        const body = JSON.parse(String(init?.body ?? '{}')) as { message: string }
        return onChat(body.message)
      }
      if (u.includes('/api/v1/organizations')) return json([ORG])
      return json({})
    }),
  )
}

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <NumiWidget />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  useNumiStore.setState({ isOpen: false, orgId: null, sessionId: undefined, messages: [], error: null })
})

test('abre el chat desde el botón flotante y muestra el estado vacío', async () => {
  stubApi(async () => json({ sessionId: 's1', reply: 'hola' }))
  const user = userEvent.setup()
  mount()

  await user.click(await screen.findByRole('button', { name: 'Abrir el chat con Numi' }))

  expect(await screen.findByRole('dialog', { name: /Numi/ })).toBeInTheDocument()
  // El saludo abre el hilo como un mensaje recibido más ("Numi" va resaltado,
  // así que el texto vive partido entre nodos).
  expect(
    screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === 'Hola, soy Numi'),
  ).toBeInTheDocument()
})

test('envía el mensaje, avisa que Numi escribe y pinta la respuesta', async () => {
  let release: (() => void) | undefined
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  stubApi(async () => {
    await pending
    return json({ sessionId: 'sess-1', reply: 'Te deben **$70.000**.' })
  })
  const user = userEvent.setup()
  mount()

  await user.click(await screen.findByRole('button', { name: 'Abrir el chat con Numi' }))
  await user.type(screen.getByLabelText('Mensaje para Numi'), '¿Cuánto me deben?')
  await user.click(screen.getByRole('button', { name: 'Enviar mensaje' }))

  expect(await screen.findByText('¿Cuánto me deben?')).toBeInTheDocument()
  expect(await screen.findByText('Numi está escribiendo…')).toBeInTheDocument()

  release?.()

  expect(await screen.findByText('$70.000')).toBeInTheDocument()
  await waitFor(() => expect(screen.queryByText('Numi está escribiendo…')).not.toBeInTheDocument())
  // El sessionId del backend se guarda para continuar la conversación.
  expect(useNumiStore.getState().sessionId).toBe('sess-1')
})

test('un fallo del backend deja reintentar sin volver a escribir', async () => {
  let attempts = 0
  stubApi(async () => {
    attempts += 1
    return attempts === 1
      ? json({ error: { code: 'INTERNAL', message: 'Numi no está disponible' } }, 500)
      : json({ sessionId: 's2', reply: 'Ya estoy aquí.' })
  })
  const user = userEvent.setup()
  mount()

  await user.click(await screen.findByRole('button', { name: 'Abrir el chat con Numi' }))
  await user.type(screen.getByLabelText('Mensaje para Numi'), 'hola')
  await user.click(screen.getByRole('button', { name: 'Enviar mensaje' }))

  await user.click(await screen.findByRole('button', { name: 'Reintentar' }))

  expect(await screen.findByText('Ya estoy aquí.')).toBeInTheDocument()
  expect(screen.queryByText('Numi no está disponible')).not.toBeInTheDocument()
})

test('sin proveedor de IA (422) manda a Configuración en vez de reintentar', async () => {
  stubApi(async () =>
    json(
      { error: { code: 'VALIDATION', message: 'El asistente no está configurado.' } },
      422,
    ),
  )
  const user = userEvent.setup()
  mount()

  await user.click(await screen.findByRole('button', { name: 'Abrir el chat con Numi' }))
  await user.type(screen.getByLabelText('Mensaje para Numi'), 'hola')
  await user.click(screen.getByRole('button', { name: 'Enviar mensaje' }))

  expect(await screen.findByRole('link', { name: 'Ir a Configuración' })).toHaveAttribute(
    'href',
    '/config/asistente',
  )
  expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
})

test('deja preparados adjuntos y voz, pero anunciados como próximos', async () => {
  stubApi(async () => json({ sessionId: 's3', reply: 'hola' }))
  const user = userEvent.setup()
  mount()

  await user.click(await screen.findByRole('button', { name: 'Abrir el chat con Numi' }))

  expect(screen.getByRole('button', { name: /Adjuntar archivo/ })).toBeDisabled()
  expect(screen.getByRole('button', { name: /Mensaje de voz/ })).toBeDisabled()
})

test('sella la hora de cada mensaje', async () => {
  stubApi(async (message) => json({ sessionId: 's4', reply: `eco: ${message}` }))
  const user = userEvent.setup()
  mount()

  await user.click(await screen.findByRole('button', { name: 'Abrir el chat con Numi' }))
  await user.type(screen.getByLabelText('Mensaje para Numi'), 'hola')
  await user.click(screen.getByRole('button', { name: 'Enviar mensaje' }))

  expect(await screen.findByText('eco: hola')).toBeInTheDocument()
  // Una marca de tiempo por mensaje (usuario + respuesta).
  const log = screen.getByRole('log')
  expect(log.querySelectorAll('time')).toHaveLength(2)
})

test('el botón flotante desaparece con el chat abierto y recupera el foco al cerrar', async () => {
  stubApi(async () => json({ sessionId: 's5', reply: 'hola' }))
  const user = userEvent.setup()
  mount()

  await user.click(await screen.findByRole('button', { name: 'Abrir el chat con Numi' }))
  // Abierto manda la X de la cabecera: nada de dos cierres flotando.
  expect(screen.queryByRole('button', { name: 'Abrir el chat con Numi' })).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Cerrar el chat' }))

  const launcher = await screen.findByRole('button', { name: 'Abrir el chat con Numi' })
  expect(launcher).toHaveFocus()
})
