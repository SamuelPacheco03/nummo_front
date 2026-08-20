import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { CAPABILITIES, json, tenantApiResponse } from '@/test/tenant-api'
import { NotificationPreferencesPage } from './preferences-page'

const estado = vi.hoisted(() => ({
  permisos: [] as string[],
  pushPreview: 'FULL' as 'FULL' | 'DISCREET',
  llamadas: [] as { method: string; url: string; body: unknown }[],
}))

/** Una preferencia como la firma el contrato, con lo que cada test necesite. */
function pref(type: string, over: Record<string, unknown> = {}) {
  return {
    type,
    category: 'RECEIVABLES',
    priority: 'NORMAL',
    enabled: true,
    channels: ['INAPP', 'PUSH'],
    supportedChannels: ['INAPP', 'PUSH'],
    leadDays: [],
    supportsLeadDays: false,
    ...over,
  }
}

const PREFERENCIAS = [
  pref('receivable.due_soon', { supportsLeadDays: true, leadDays: [5, 1] }),
  pref('receivable.overdue'),
  // Solo queda registrado en el centro: su tipo no admite móvil.
  pref('recurring.receivables_generated', {
    channels: ['INAPP'],
    supportedChannels: ['INAPP'],
  }),
  pref('member.joined', {
    category: 'TEAM',
    channels: ['INAPP'],
    supportedChannels: ['INAPP'],
  }),
]

function stubApi() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url)
      const method = (init?.method ?? 'GET').toUpperCase()
      const body = init?.body ? JSON.parse(String(init.body)) : undefined
      estado.llamadas.push({ method, url: u, body })

      if (u.includes('/notifications/preferences')) {
        // Las dos escrituras devuelven el estado completo, igual que el GET.
        return json({
          availableChannels: ['INAPP', 'PUSH'],
          preferences: PREFERENCIAS,
          pushPreview: u.includes('push-preview') ? body.pushPreview : estado.pushPreview,
        })
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
        <NotificationPreferencesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** Monta y espera a que el catálogo esté pintado. */
async function abrir() {
  montar()
  await screen.findByText('Un cobro está por vencer')
}

const escrituras = () => estado.llamadas.filter((c) => c.method === 'PUT')
const guardar = () => screen.getByRole('button', { name: 'Guardar cambios' })
const movil = (aviso: string) => screen.getByRole('checkbox', { name: `En el móvil · ${aviso}` })

beforeEach(() => {
  estado.permisos = ['notifications.read', 'notifications.manage']
  estado.pushPreview = 'FULL'
  estado.llamadas = []
  stubApi()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test('el catálogo se dibuja desde el contrato, agrupado y con el titular del aviso', async () => {
  await abrir()

  // El rótulo del interruptor es el mismo titular que va a llegar: quien acaba
  // de recibirlo busca esa frase.
  expect(screen.getByText('Tienes un cobro vencido')).toBeVisible()
  expect(screen.getByText('Alguien nuevo entró al equipo')).toBeVisible()
  expect(screen.getByText('Cartera')).toBeVisible()
  expect(screen.getByText('Equipo')).toBeVisible()
})

test('«En la app» no es una casilla, porque no apagaría nada', async () => {
  /*
    El centro es el registro, no un canal: el motor descarta `INAPP` al decidir
    por dónde interrumpir. Una casilla que no apaga nada sería una mentira.
  */
  await abrir()

  expect(screen.queryByRole('checkbox', { name: /En la app/ })).not.toBeInTheDocument()
  expect(screen.getAllByText('Móvil')).toHaveLength(1)
})

test('un aviso que no admite móvil no ofrece la casilla', async () => {
  await abrir()

  const sinMovil = 'Se generaron los cobros del período'
  expect(movil('Tienes un cobro vencido')).toBeInTheDocument()
  // El interruptor del aviso sigue estando; lo que no hay es su casilla de móvil.
  expect(screen.getByRole('checkbox', { name: sinMovil })).toBeInTheDocument()
  expect(
    screen.queryByRole('checkbox', { name: `En el móvil · ${sinMovil}` }),
  ).not.toBeInTheDocument()
})

test('los días de antelación se leen, no se editan', async () => {
  await abrir()

  expect(screen.getByText('Te avisamos 5 y 1 días antes')).toBeVisible()
})

test('se guarda solo lo que cambió', async () => {
  const user = userEvent.setup()
  await abrir()

  expect(guardar()).toBeDisabled()
  await user.click(movil('Un cobro está por vencer'))
  expect(guardar()).toBeEnabled()

  await user.click(guardar())

  await waitFor(() => expect(escrituras()).toHaveLength(1))
  expect(escrituras()[0].body).toEqual({
    preferences: [
      { type: 'receivable.due_soon', enabled: true, channels: ['INAPP'] },
    ],
  })
})

test('dejar algo como estaba no cuenta como cambio', async () => {
  // Es la razón de calcular el diff al enviar en vez de marcar sucia cada
  // casilla que se toca.
  const user = userEvent.setup()
  await abrir()

  await user.click(movil('Un cobro está por vencer'))
  await user.click(movil('Un cobro está por vencer'))

  expect(guardar()).toBeDisabled()
})

test('apagar un aviso apaga sus canales: no hay canal para lo que no quieres', async () => {
  const user = userEvent.setup()
  await abrir()

  await user.click(screen.getByRole('checkbox', { name: 'Tienes un cobro vencido' }))

  expect(movil('Tienes un cobro vencido')).toBeDisabled()
})

test('la pantalla de bloqueo se guarda por su propio endpoint', async () => {
  const user = userEvent.setup()
  await abrir()

  await user.click(screen.getByRole('tab', { name: 'Discreto' }))
  // El ejemplo cambia con la elección: es lo que hace entender qué se está eligiendo.
  expect(screen.getByText(/Tienes una notificación nueva/)).toBeVisible()

  await user.click(guardar())

  await waitFor(() => expect(escrituras()).toHaveLength(1))
  expect(escrituras()[0].url).toContain('/preferences/push-preview')
  expect(escrituras()[0].body).toEqual({ pushPreview: 'DISCREET' })
})

test('tras guardar, el botón se apaga solo', async () => {
  // La pantalla se queda, así que hay que volver a marcarla limpia a mano con
  // la respuesta del servidor (§45.7).
  const user = userEvent.setup()
  await abrir()

  await user.click(movil('Un cobro está por vencer'))
  await user.click(guardar())

  await waitFor(() => expect(guardar()).toBeDisabled())
})

test('sin permiso de gestión se mira, no se toca', async () => {
  estado.permisos = ['notifications.read']
  await abrir()

  expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument()
  expect(screen.getByRole('checkbox', { name: 'Tienes un cobro vencido' })).toBeDisabled()
  expect(screen.getByText('Solo puedes mirar')).toBeVisible()
  // El selector se vuelve texto: un control que no responde es peor que una frase.
  expect(screen.queryByRole('tab', { name: 'Discreto' })).not.toBeInTheDocument()
})

test('sin permiso de lectura no se pide nada y se dice por qué', async () => {
  estado.permisos = []
  montar()

  expect(await screen.findByText('No puedes ver esto')).toBeVisible()
  expect(estado.llamadas.some((c) => c.url.includes('/notifications/preferences'))).toBe(false)
})

test('un fallo al cargar es un estado de pantalla, no una lista vacía', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const u = String(url)
      if (u.includes('/notifications/preferences')) {
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
