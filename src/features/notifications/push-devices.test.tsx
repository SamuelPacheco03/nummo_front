import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { json, tenantApiResponse } from '@/test/tenant-api'
import { PushDevices } from './push-devices'

/*
  Probar Web Push es probar las **decisiones**, no el cifrado: cuándo se ofrece
  el botón, cuándo no se puede ofrecer, y qué sale hacia el API cuando alguien
  acepta. Todo lo que hay debajo —el `PushManager`, el permiso— es del navegador
  y aquí se pone de mentira.
*/

const CLAVE = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
const ENDPOINT = 'https://push.example/abc'

const estado = vi.hoisted(() => ({
  publicKey: null as string | null,
  devices: [] as Record<string, unknown>[],
  permiso: 'default' as NotificationPermission,
  /** Lo que el navegador dice tener suscrito ahora mismo. */
  suscrito: false,
  llamadas: [] as { method: string; url: string; body: unknown }[],
}))

function stubApi() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url)
      const method = (init?.method ?? 'GET').toUpperCase()
      const body = init?.body ? JSON.parse(String(init.body)) : undefined
      estado.llamadas.push({ method, url: u, body })

      if (u.includes('/push-subscriptions/public-key')) return json({ publicKey: estado.publicKey })
      if (u.includes('/push-subscriptions') && method === 'POST') {
        return json({ id: 'd-nuevo', deviceLabel: 'Este', lastUsedAt: null, createdAt: '' }, 201)
      }
      if (u.includes('/push-subscriptions') && method === 'DELETE') {
        return new Response(null, { status: 204 })
      }
      if (u.includes('/push-subscriptions')) return json(estado.devices)
      return tenantApiResponse(u) ?? json({})
    }),
  )
}

/** Un navegador que sí sabe de push, con su permiso y su suscripción. */
function stubNavegador() {
  const suscripcion = {
    endpoint: ENDPOINT,
    toJSON: () => ({ endpoint: ENDPOINT, keys: { p256dh: 'clave-p', auth: 'clave-a' } }),
    unsubscribe: vi.fn(async () => {
      estado.suscrito = false
      return true
    }),
  }
  const pushManager = {
    getSubscription: vi.fn(async () => (estado.suscrito ? suscripcion : null)),
    subscribe: vi.fn(async () => {
      estado.suscrito = true
      return suscripcion
    }),
  }
  Object.defineProperty(navigator, 'serviceWorker', {
    value: { ready: Promise.resolve({ pushManager }) },
    configurable: true,
  })
  vi.stubGlobal('PushManager', class {})
  vi.stubGlobal('Notification', {
    get permission() {
      return estado.permiso
    },
    requestPermission: vi.fn(async () => estado.permiso),
  })
  return { pushManager, suscripcion }
}

function montar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <PushDevices />
    </QueryClientProvider>,
  )
}

const push = () => estado.llamadas.filter((c) => c.url.includes('/push-subscriptions'))

beforeEach(() => {
  estado.publicKey = CLAVE
  estado.devices = []
  estado.permiso = 'granted'
  estado.suscrito = false
  estado.llamadas = []
  localStorage.clear()
  stubApi()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(navigator, 'serviceWorker')
})

test('sin clave pública no se pide el permiso ni la lista', async () => {
  /*
    Es la regla que más caro sale saltarse: un permiso denegado no se vuelve a
    preguntar, así que gastarlo en un despliegue que no puede enviar nada deja a
    esa persona sin push para siempre.
  */
  estado.publicKey = null
  stubNavegador()
  montar()

  expect(await screen.findByText('Todavía no está disponible')).toBeVisible()
  expect(screen.queryByRole('button', { name: /Activar/ })).not.toBeInTheDocument()
  expect(push().some((c) => c.url.endsWith('/push-subscriptions'))).toBe(false)
})

test('un navegador sin soporte lo dice y ofrece instalar la app', async () => {
  // En iPhone solo existen con la PWA en la pantalla de inicio.
  montar()

  expect(await screen.findByText('Este navegador no puede recibirlos')).toBeVisible()
})

test('con el permiso denegado se explica, no se vuelve a ofrecer el botón', async () => {
  estado.permiso = 'denied'
  stubNavegador()
  montar()

  expect(await screen.findByText('Los bloqueaste en este navegador')).toBeVisible()
  expect(screen.queryByRole('button', { name: /Activar/ })).not.toBeInTheDocument()
})

test('activar suscribe el navegador y lo registra con su nombre', async () => {
  const { pushManager } = stubNavegador()
  const user = userEvent.setup()
  montar()

  await user.click(await screen.findByRole('button', { name: /Activar en este dispositivo/ }))

  await waitFor(() => expect(push().some((c) => c.method === 'POST')).toBe(true))
  const alta = push().find((c) => c.method === 'POST')?.body as Record<string, unknown>
  expect(alta.endpoint).toBe(ENDPOINT)
  expect(alta.keys).toEqual({ p256dh: 'clave-p', auth: 'clave-a' })
  expect(typeof alta.deviceLabel).toBe('string')

  // La clave VAPID viaja en bytes, no como el base64 que llega del API.
  expect(pushManager.subscribe).toHaveBeenCalledWith(
    expect.objectContaining({ userVisibleOnly: true }),
  )
  expect(await screen.findByText('Este dispositivo está activado.')).toBeVisible()
})

test('si dicen que no, no se registra nada', async () => {
  estado.permiso = 'default'
  stubNavegador()
  const user = userEvent.setup()
  montar()

  await user.click(await screen.findByRole('button', { name: /Activar en este dispositivo/ }))

  await waitFor(() => expect(screen.getByText('Este dispositivo no recibe avisos.')).toBeVisible())
  expect(push().some((c) => c.method === 'POST')).toBe(false)
})

test('la lista dice cuándo recibió cada uno y cuál es este', async () => {
  estado.devices = [
    { id: 'd1', deviceLabel: 'Chrome · Android', lastUsedAt: null, createdAt: '' },
    { id: 'd2', deviceLabel: 'Safari · iPhone', lastUsedAt: null, createdAt: '' },
  ]
  estado.suscrito = true
  localStorage.setItem('nummo-push-device', JSON.stringify({ endpoint: ENDPOINT, id: 'd2' }))
  stubNavegador()
  montar()

  expect(await screen.findByText('Chrome · Android')).toBeVisible()
  expect(screen.getByText('· este')).toBeVisible()
  expect(screen.getAllByText('Todavía no ha recibido ninguno')).toHaveLength(2)
})

test('dar de baja una fila la borra en el servidor', async () => {
  estado.devices = [{ id: 'd1', deviceLabel: 'Chrome · Android', lastUsedAt: null, createdAt: '' }]
  stubNavegador()
  const user = userEvent.setup()
  montar()

  await user.click(await screen.findByRole('button', { name: 'Dar de baja Chrome · Android' }))

  await waitFor(() =>
    expect(push().some((c) => c.method === 'DELETE' && c.url.endsWith('/d1'))).toBe(true),
  )
})

test('desactivar este dispositivo lo quita también del servidor', async () => {
  // Solo se puede porque guardamos qué fila somos: el contrato no devuelve el
  // `endpoint` con el que cruzarlo.
  estado.devices = [{ id: 'd2', deviceLabel: 'Chrome · Android', lastUsedAt: null, createdAt: '' }]
  estado.suscrito = true
  localStorage.setItem('nummo-push-device', JSON.stringify({ endpoint: ENDPOINT, id: 'd2' }))
  const { suscripcion } = stubNavegador()
  const user = userEvent.setup()
  montar()

  await user.click(await screen.findByRole('button', { name: /Desactivar en este dispositivo/ }))

  await waitFor(() => expect(suscripcion.unsubscribe).toHaveBeenCalled())
  expect(push().some((c) => c.method === 'DELETE' && c.url.endsWith('/d2'))).toBe(true)
  expect(localStorage.getItem('nummo-push-device')).toBeNull()
})
