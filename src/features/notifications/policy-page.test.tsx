import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { CAPABILITIES, json, ORG_ID, tenantApiResponse } from '@/test/tenant-api'
import { NotificationPolicyPage } from './policy-page'

const estado = vi.hoisted(() => ({
  permisos: [] as string[],
  ajustes: {} as Record<string, unknown>,
  llamadas: [] as { method: string; url: string; body: unknown }[],
}))

function ajustes(over: Record<string, unknown> = {}) {
  return {
    organizationId: ORG_ID,
    // El backend lo guarda como `time`, así que llega con segundos.
    reminderLocalTime: '08:00:00',
    lowBalanceThreshold: null,
    lowBalanceCurrency: 'COP',
    teamActivityThreshold: null,
    updatedAt: '2026-08-20T10:00:00Z',
    ...over,
  }
}

function stubApi() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url)
      const method = (init?.method ?? 'GET').toUpperCase()
      const body = init?.body ? JSON.parse(String(init.body)) : undefined
      estado.llamadas.push({ method, url: u, body })

      if (u.includes('/notifications/settings')) {
        // El PUT devuelve la política ya guardada, igual que el GET.
        return json(method === 'PUT' ? ajustes({ ...estado.ajustes, ...body }) : estado.ajustes)
      }
      if (u.includes('/me/capabilities')) {
        return json({ ...CAPABILITIES, permissions: estado.permisos })
      }
      return tenantApiResponse(u) ?? json({})
    }),
  )
}

function montar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <NotificationPolicyPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function abrir() {
  montar()
  return await screen.findByLabelText('Hora de los recordatorios')
}

const escrituras = () => estado.llamadas.filter((c) => c.method === 'PUT')
const guardar = () => screen.getByRole('button', { name: 'Guardar' })

beforeEach(() => {
  estado.permisos = ['notifications.read', 'notifications.settings.manage']
  estado.ajustes = ajustes()
  estado.llamadas = []
  stubApi()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test('la hora llega con segundos y el campo la quiere sin ellos', async () => {
  // `time` en Postgres es `HH:mm:ss`; `<input type="time">` no lo acepta y se
  // queda vacío sin decir nada.
  const hora = await abrir()

  expect(hora).toHaveValue('08:00')
})

test('un umbral sin poner se ve vacío, no en cero', async () => {
  await abrir()

  expect(screen.getByLabelText('Avisar cuando una cuenta baje de')).toHaveValue('')
  expect(screen.getByLabelText('Avisar de lo que registra el equipo desde')).toHaveValue('')
})

test('vaciar un umbral lo manda como null, que es lo que apaga la alerta', async () => {
  estado.ajustes = ajustes({ lowBalanceThreshold: '500000.00' })
  const user = userEvent.setup()
  await abrir()

  await user.clear(screen.getByLabelText('Avisar cuando una cuenta baje de'))
  await user.click(guardar())

  await waitFor(() => expect(escrituras()).toHaveLength(1))
  expect(escrituras()[0].body).toEqual({
    reminderLocalTime: '08:00',
    lowBalanceThreshold: null,
    teamActivityThreshold: null,
  })
})

test('se guardan la hora y los dos umbrales', async () => {
  const user = userEvent.setup()
  await abrir()

  await user.type(screen.getByLabelText('Avisar cuando una cuenta baje de'), '500000')
  await user.type(screen.getByLabelText('Avisar de lo que registra el equipo desde'), '1000000')
  await user.click(guardar())

  await waitFor(() => expect(escrituras()).toHaveLength(1))
  expect(escrituras()[0].body).toEqual({
    reminderLocalTime: '08:00',
    lowBalanceThreshold: '500000',
    teamActivityThreshold: '1000000',
  })
})

test('la moneda con la que se compara se dice, no se supone', async () => {
  // El contrato la firma de solo lectura y puede no ser la de la organización.
  estado.ajustes = ajustes({ lowBalanceCurrency: 'USD' })
  await abrir()

  // Se vigila que la moneda APAREZCA, no cómo esté redactada la frase.
  expect(screen.getByText(/una cuenta en USD/)).toBeVisible()
})

test('sin el permiso propio se mira, no se toca', async () => {
  /*
    Leerla basta con `notifications.read`: esconder la pantalla entera diría lo
    contrario de lo que hace el backend, que solo bloquea escribir.
  */
  estado.permisos = ['notifications.read']
  await abrir()

  expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument()
  expect(screen.getByLabelText('Hora de los recordatorios')).toBeDisabled()
  expect(screen.getByLabelText('Avisar cuando una cuenta baje de')).toBeDisabled()
})

test('sin permiso de lectura no se pide nada y se dice por qué', async () => {
  estado.permisos = []
  montar()

  expect(await screen.findByText('No puedes ver esto')).toBeVisible()
  expect(estado.llamadas.some((c) => c.url.includes('/notifications/settings'))).toBe(false)
})

test('lleva a las preferencias de cada persona, que es la otra mitad', async () => {
  await abrir()

  expect(screen.getByRole('link', { name: 'sus notificaciones' })).toHaveAttribute(
    'href',
    '/config/notificaciones',
  )
})

test('un fallo al cargar es un estado de pantalla', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const u = String(url)
      if (u.includes('/notifications/settings')) {
        return json({ error: { code: 'INTERNAL', message: 'Se rompió' } }, 500)
      }
      if (u.includes('/me/capabilities')) {
        return json({ ...CAPABILITIES, permissions: estado.permisos })
      }
      return tenantApiResponse(u) ?? json({})
    }),
  )
  montar()

  const alerta = await screen.findByRole('alert')
  expect(within(alerta).getByRole('button', { name: 'Reintentar' })).toBeVisible()
})
