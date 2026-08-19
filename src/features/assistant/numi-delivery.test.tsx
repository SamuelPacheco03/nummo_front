import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { NumiWidget } from './numi-widget'
import { useNumiStore } from './numi-store'
import { json, tenantApiResponse } from '@/test/tenant-api'

/*
  El arnés propio de este archivo: aquí hace falta **decidir cuándo contesta Numi**,
  no solo qué contesta. Toda la entrega —la cola, el estado de cada mensaje, el
  reintento— ocurre entre que se manda y que llega, y con una respuesta inmediata ese
  intervalo no existe.
*/
const m = vi.hoisted(() => ({
  turnos: [] as { message: string; responder: (r: Response) => void }[],
}))

function stubApi() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url)
      if (u.includes('/assistant/chat')) {
        const body = JSON.parse(String(init?.body ?? '{}')) as { message: string }
        return new Promise<Response>((resolve) => {
          m.turnos.push({ message: body.message, responder: resolve })
        })
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

async function abrirChat(user: ReturnType<typeof userEvent.setup>) {
  mount()
  await user.click(await screen.findByRole('button', { name: 'Abrir el chat con Numi' }))
}

async function escribir(user: ReturnType<typeof userEvent.setup>, texto: string) {
  await user.type(screen.getByLabelText('Mensaje para Numi'), texto)
  await user.keyboard('{Enter}')
}

/** Contesta el turno número `n` (1-based) tal como llegó al servidor. */
async function responder(n: number, body: unknown, status = 200) {
  await waitFor(() => expect(m.turnos.length).toBeGreaterThanOrEqual(n))
  m.turnos[n - 1]?.responder(json(body, status))
}

beforeEach(() => {
  m.turnos = []
  stubApi()
  localStorage.clear()
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
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test('escribir mientras Numi contesta no se pierde: espera turno y sale después', async () => {
  const user = userEvent.setup()
  await abrirChat(user)

  await escribir(user, 'cuánto me deben')
  await waitFor(() => expect(m.turnos).toHaveLength(1))

  // Con el turno todavía en el aire, la caja sigue viva y admite el siguiente.
  await escribir(user, 'y los egresos del mes')
  expect(await screen.findByText('y los egresos del mes')).toBeInTheDocument()
  expect(screen.getByText('En espera')).toBeInTheDocument()
  // Un turno a la vez: el segundo no ha salido todavía.
  expect(m.turnos).toHaveLength(1)

  await responder(1, { sessionId: 's1', reply: 'Te deben $2.350.000' })

  // Al quedar libre, la cola se vacía sola y en orden.
  await waitFor(() => expect(m.turnos).toHaveLength(2))
  expect(m.turnos[1]?.message).toBe('y los egresos del mes')
  await waitFor(() => expect(screen.queryByText('En espera')).not.toBeInTheDocument())
})

test('un mensaje que no salió lo dice, y reintentar lo vuelve a mandar', async () => {
  const user = userEvent.setup()
  await abrirChat(user)

  await escribir(user, 'cuánto me deben')
  await responder(1, { error: { code: 'INTERNAL', message: 'Se cayó el servidor.' } }, 500)

  // El fallo se ve en el mensaje, no solo en un aviso suelto al final del hilo.
  expect(await screen.findByText('No se envió')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Reintentar' }))

  await waitFor(() => expect(m.turnos).toHaveLength(2))
  expect(m.turnos[1]?.message).toBe('cuánto me deben')

  await responder(2, { sessionId: 's1', reply: 'Te deben $2.350.000' })
  // Entregado no lleva marca: en un chat lo normal es que llegue.
  await waitFor(() => expect(screen.queryByText('No se envió')).not.toBeInTheDocument())
})

test('quedarse sin cuota no se ve como un fallo de red, y no ofrece reintentar', async () => {
  const user = userEvent.setup()
  await abrirChat(user)

  await escribir(user, 'cuánto me deben')
  await responder(
    1,
    {
      error: {
        code: 'LIMIT_EXCEEDED',
        message: 'Plan limit reached: ai_messages_monthly allows 2000.',
        details: { limit: 'ai_messages_monthly', max: 2000, used: 2000, plan: 'PRO', period: '2026-08' },
      },
    },
    409,
  )

  // Dice qué se acabó y cuánto era. «No se pudo contactar a Numi» era mentira.
  expect(await screen.findByText('Llevas 2000 de 2000 mensajes con Numi este mes.')).toBeInTheDocument()
  // `findBy` y no `getBy`: qué se ofrece depende de las capacidades, que llegan
  // por su propia petición y pueden no haber vuelto cuando llega el error.
  expect(await screen.findByText(/Amplía el plan/)).toBeInTheDocument()

  /*
    Y sobre todo: ni un botón de reintentar. La cuota no se va a rellenar por volver a
    pulsar, así que ofrecerlo es mandar al usuario contra la misma pared.
  */
  expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
  expect(screen.getByText('No se envió')).toBeInTheDocument()
})

test('lo que el plan no incluye se dice tal cual, no como error inesperado', async () => {
  const user = userEvent.setup()
  await abrirChat(user)

  await escribir(user, 'concíliame el banco')
  await responder(
    1,
    {
      error: {
        code: 'FEATURE_NOT_AVAILABLE',
        message: 'Your plan does not include this feature.',
        details: { feature: 'bank_reconciliation', plan: 'BASIC' },
      },
    },
    403,
  )

  expect(await screen.findByText('Tu plan no incluye esta función.')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
})
