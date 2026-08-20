import { useState } from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useLocation } from 'react-router'
import { CAPABILITIES, json, tenantApiResponse } from '@/test/tenant-api'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { NotificationBell } from './notification-bell'
import { useNotificationStream } from './hooks'
import { NotificationsDrawer } from './notifications-drawer'

/*
  El centro se prueba entero —campana y panel— sobre `fetch`, no con los hooks
  simulados: lo que hay que sujetar es el recorrido completo (qué se pide, qué
  se pinta, qué se manda al pulsar), y con los hooks de mentira la mitad de eso
  deja de existir.
*/

const estado = vi.hoisted(() => ({
  permisos: [] as string[],
  items: [] as Record<string, unknown>[],
  unread: 0,
  /** Las URLs con su método, en orden, para afirmar sobre lo que salió. */
  llamadas: [] as { method: string; url: string }[],
}))

function aviso(over: Record<string, unknown> = {}) {
  return {
    id: 'n1',
    type: 'receivable.overdue',
    category: 'RECEIVABLES',
    priority: 'HIGH',
    title: 'Laura Gómez se venció',
    body: 'Mensualidad de agosto por $350.000',
    icon: 'receivable-overdue',
    deepLink: '/cartera/cxc/r1',
    data: {},
    groupKey: null,
    readAt: null,
    createdAt: new Date().toISOString(),
    ...over,
  }
}

function stubApi() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url)
      const method = (init?.method ?? 'GET').toUpperCase()
      estado.llamadas.push({ method, url: u })

      if (u.includes('/notifications/unread-count')) return json({ unread: estado.unread })
      if (u.includes('/notifications/read-all')) return json({ updated: estado.unread })
      if (/\/notifications\/[^/?]+\/read/.test(u)) return new Response(null, { status: 204 })
      if (method === 'DELETE' && u.includes('/notifications/')) {
        return new Response(null, { status: 204 })
      }
      if (u.includes('/notifications')) {
        return json({
          data: estado.items,
          page: 1,
          pageSize: 20,
          total: estado.items.length,
          totalPages: 1,
        })
      }
      // Las capacidades **antes** que la lista de organizaciones: sus URLs
      // comparten prefijo (§ `tenant-api.ts`).
      if (u.includes('/me/capabilities')) {
        return json({ ...CAPABILITIES, permissions: estado.permisos })
      }
      return tenantApiResponse(u) ?? json({})
    }),
  )
}

/** Dónde estamos, para comprobar que un aviso lleva a su sitio. */
function Donde() {
  return <span data-testid="ruta">{useLocation().pathname}</span>
}

/** La campana y el panel, montados como en el shell: el panel una sola vez. */
function Centro() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <NotificationBell onClick={() => setOpen(true)} />
      <NotificationsDrawer open={open} onOpenChange={setOpen} />
      <Donde />
    </>
  )
}

function montar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/cartera/cxc']}>
        <Centro />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** Abre el panel y espera a que la lista esté pintada. */
async function abrir(user: ReturnType<typeof userEvent.setup>) {
  montar()
  await user.click(await screen.findByRole('button', { name: /Notificaciones/ }))
  return screen.getByRole('dialog')
}

const urls = () => estado.llamadas.filter((c) => c.url.includes('/notifications'))

/**
 * La fila de un aviso, y su botón de abrir.
 *
 * Por el cuerpo y no por el título: el botón de descartar lleva el título en su
 * rótulo, así que buscar por él encuentra los dos.
 */
const fila = (panel: HTMLElement) => within(panel).getByRole('listitem')
const abrirAviso = (panel: HTMLElement) =>
  within(fila(panel)).getByRole('button', { name: /Mensualidad de agosto/ })

beforeEach(() => {
  estado.permisos = ['notifications.read', 'notifications.manage']
  estado.items = [aviso()]
  estado.unread = 1
  estado.llamadas = []
  stubApi()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test('el globo dice cuántos hay sin leer, y con el panel cerrado', async () => {
  estado.unread = 3
  montar()

  // Lo que importa del globo es que se vea sin abrir nada.
  expect(await screen.findByRole('button', { name: 'Notificaciones · 3 sin leer' })).toBeVisible()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('sin nada sin leer no hay globo, pero sigue habiendo campana', async () => {
  estado.unread = 0
  montar()

  const campana = await screen.findByRole('button', { name: 'Notificaciones' })
  expect(within(campana).queryByText('0')).not.toBeInTheDocument()
})

test('un contador de tres cifras no deforma el botón', async () => {
  estado.unread = 140
  montar()

  const campana = await screen.findByRole('button', { name: 'Notificaciones · 140 sin leer' })
  // El rótulo dice la cifra exacta; el globo, lo que cabe.
  expect(within(campana).getByText('99+')).toBeVisible()
})

test('sin permiso de lectura no se ofrece la campana', async () => {
  /*
    §47: un botón que abre una lista que va a responder 403 es peor que no
    ofrecerlo. Y sin campana tampoco se pide el contador.
  */
  estado.permisos = []
  montar()

  await waitFor(() => expect(estado.llamadas.some((c) => c.url.includes('/me/capabilities'))).toBe(true))
  expect(screen.queryByRole('button', { name: /Notificaciones/ })).not.toBeInTheDocument()
})

test('la lista no se pide hasta que el panel se abre', async () => {
  const user = userEvent.setup()
  montar()

  await screen.findByRole('button', { name: /Notificaciones/ })
  await waitFor(() => expect(urls().some((c) => c.url.includes('unread-count'))).toBe(true))
  expect(urls().some((c) => /\/notifications\?/.test(c.url))).toBe(false)

  await user.click(screen.getByRole('button', { name: /Notificaciones/ }))
  await waitFor(() => expect(urls().some((c) => /\/notifications\?/.test(c.url))).toBe(true))
})

test('un aviso se lee entero: título, cuerpo, categoría y cuánto hace', async () => {
  const user = userEvent.setup()
  const panel = await abrir(user)

  expect(await within(panel).findByText('Laura Gómez se venció')).toBeVisible()
  expect(within(panel).getByText('Mensualidad de agosto por $350.000')).toBeVisible()
  expect(within(panel).getByText(/Cartera · ahora/)).toBeVisible()
  // §7: el estado no se fía solo del color del punto.
  expect(within(fila(panel)).getByText('Sin leer')).toBeInTheDocument()
})

test('abrir un aviso lo marca leído y lleva a su destino', async () => {
  const user = userEvent.setup()
  const panel = await abrir(user)

  await within(panel).findByText('Laura Gómez se venció')
  await user.click(abrirAviso(panel))

  await waitFor(() =>
    expect(
      urls().some((c) => c.method === 'POST' && c.url.endsWith(`/notifications/n1/read`)),
    ).toBe(true),
  )
  expect(screen.getByTestId('ruta')).toHaveTextContent('/cartera/cxc/r1')
})

test('un aviso ya leído no se vuelve a marcar', async () => {
  estado.items = [aviso({ readAt: new Date().toISOString() })]
  estado.unread = 0
  const user = userEvent.setup()
  const panel = await abrir(user)

  await within(panel).findByText('Laura Gómez se venció')
  await user.click(abrirAviso(panel))

  expect(urls().some((c) => c.method === 'POST' && c.url.includes('/read'))).toBe(false)
  expect(screen.getByTestId('ruta')).toHaveTextContent('/cartera/cxc/r1')
})

test('un aviso sin destino se marca leído y deja el panel donde estaba', async () => {
  // `deepLink` es opcional en el contrato: hay avisos que no llevan a ninguna
  // ficha. Cerrar el panel sin ir a ningún sitio sería perder el resto.
  estado.items = [aviso({ deepLink: null })]
  const user = userEvent.setup()
  const panel = await abrir(user)

  await within(panel).findByText('Laura Gómez se venció')
  await user.click(abrirAviso(panel))

  await waitFor(() => expect(urls().some((c) => c.url.includes('/read'))).toBe(true))
  expect(screen.getByTestId('ruta')).toHaveTextContent('/cartera/cxc')
  expect(screen.getByRole('dialog')).toBeVisible()
})

test('descartar un aviso lo saca de la bandeja', async () => {
  const user = userEvent.setup()
  const panel = await abrir(user)

  await user.click(
    await within(panel).findByRole('button', { name: 'Descartar «Laura Gómez se venció»' }),
  )

  await waitFor(() =>
    expect(
      urls().some((c) => c.method === 'DELETE' && c.url.endsWith('/notifications/n1')),
    ).toBe(true),
  )
})

test('«Sin leer» filtra por el endpoint, no en el cliente', async () => {
  const user = userEvent.setup()
  const panel = await abrir(user)

  await user.click(within(panel).getByRole('tab', { name: 'Sin leer' }))

  await waitFor(() => expect(urls().some((c) => c.url.includes('unread=true'))).toBe(true))
})

test('la categoría también viaja al endpoint', async () => {
  const user = userEvent.setup()
  const panel = await abrir(user)

  await user.selectOptions(within(panel).getByLabelText('Categoría'), 'PAYABLES')

  await waitFor(() => expect(urls().some((c) => c.url.includes('category=PAYABLES'))).toBe(true))
})

test('sin permiso de gestión se puede mirar, no tocar', async () => {
  /*
    Las tres escrituras del centro —marcar una, marcar todas y descartar— piden
    `notifications.manage`. Con solo lectura el panel sigue sirviendo: se lee y
    se navega, que es para lo que se abre.
  */
  estado.permisos = ['notifications.read']
  const user = userEvent.setup()
  const panel = await abrir(user)

  await within(panel).findByText('Laura Gómez se venció')
  expect(within(panel).queryByRole('button', { name: /Marcar todo/ })).not.toBeInTheDocument()
  expect(within(panel).queryByRole('button', { name: /^Descartar/ })).not.toBeInTheDocument()

  await user.click(abrirAviso(panel))
  expect(urls().some((c) => c.method === 'POST')).toBe(false)
  expect(screen.getByTestId('ruta')).toHaveTextContent('/cartera/cxc/r1')
})

test('marcar todo como leído lo pide una vez', async () => {
  const user = userEvent.setup()
  const panel = await abrir(user)

  await user.click(await within(panel).findByRole('button', { name: /Marcar todo como leído/ }))

  await waitFor(() =>
    expect(urls().filter((c) => c.url.endsWith('/notifications/read-all'))).toHaveLength(1),
  )
})

test('sin avisos se explica qué va a llegar aquí; con filtros, cómo soltarlos', async () => {
  estado.items = []
  estado.unread = 0
  const user = userEvent.setup()
  const panel = await abrir(user)

  // §27: nunca «No hay datos» a secas.
  expect(await within(panel).findByText('No tienes notificaciones')).toBeVisible()
  expect(within(panel).queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument()
  // Sin nada sin leer no hay nada que marcar.
  expect(within(panel).getByRole('button', { name: /Marcar todo como leído/ })).toBeDisabled()

  await user.click(within(panel).getByRole('tab', { name: 'Sin leer' }))

  // Con un filtro puesto el vacío es otro: el siguiente paso es soltarlo.
  expect(await within(panel).findByRole('button', { name: 'Limpiar filtros' })).toBeVisible()
})

/*
  ---------- El stream ----------

  `EventSource` no existe en jsdom, así que se pone uno de mentira que además
  deja emitir tramas a mano. Lo que se comprueba no es el transporte —eso ya lo
  hace `lib/realtime-stream.test.ts`— sino la consecuencia: que un aviso emitido
  con el panel cerrado mueva el número del globo.
*/

class FakeSource {
  static ultima: FakeSource | null = null
  readonly listeners = new Map<string, Set<EventListener>>()

  constructor() {
    FakeSource.ultima = this
  }

  addEventListener(kind: string, fn: EventListener) {
    const set = this.listeners.get(kind) ?? new Set()
    this.listeners.set(kind, set)
    set.add(fn)
  }

  close() {}

  emitir(kind: string, data: unknown) {
    for (const fn of this.listeners.get(kind) ?? []) {
      fn({ data: JSON.stringify(data) } as MessageEvent)
    }
  }
}

/** La campana con el stream enganchado, como lo monta el shell. */
function CentroEnVivo() {
  const { orgId } = useCurrentOrg()
  useNotificationStream(orgId)
  return <NotificationBell onClick={() => {}} />
}

test('un aviso por el stream mueve el globo sin recargar', async () => {
  FakeSource.ultima = null
  vi.stubGlobal('EventSource', FakeSource)
  estado.unread = 1

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <CentroEnVivo />
      </MemoryRouter>
    </QueryClientProvider>,
  )

  await screen.findByRole('button', { name: 'Notificaciones · 1 sin leer' })
  await waitFor(() => expect(FakeSource.ultima).not.toBeNull())

  /*
    La trama trae un id y nada más: no se inserta nada en la caché, se invalida
    y el contador se vuelve a pedir. Es la misma llamada que al reconectar.
  */
  estado.unread = 4
  act(() => FakeSource.ultima?.emitir('notification', { notificationId: 'n2' }))

  expect(await screen.findByRole('button', { name: 'Notificaciones · 4 sin leer' })).toBeVisible()
})
