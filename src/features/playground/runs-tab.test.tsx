import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { RunsTab } from './runs-tab'
import { json } from '@/test/tenant-api'

/**
 * La pestaña de turnos repite las cifras de la traza en forma de columna, así que repite
 * también su forma de mentir: un `null` pintado como cero aquí sale multiplicado por cada
 * fila.
 */

function summary(over: Record<string, unknown> = {}) {
  return {
    id: 'tr1',
    at: '2026-08-20T10:00:00Z',
    organizationId: 'o1',
    userId: 'u1',
    conversationId: 'c1',
    kind: 'turn',
    origin: 'user',
    provider: 'anthropic',
    model: 'claude-sonnet-5',
    source: 'PLATFORM',
    usage: { input: 1200, output: 300, cacheRead: null, cacheWrite: null, noCache: null, reasoning: null },
    costMicroUsd: 3200,
    ttftMs: 400,
    stepsUsed: 1,
    finishReason: 'stop',
    totalMs: 1200,
    toolNames: ['list_receivables'],
    groundingViolated: false,
    stopped: false,
    failed: false,
    ...over,
  }
}

const m = vi.hoisted(() => ({ runs: [] as unknown[] }))

function stubApi() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const u = String(url)
      if (u.includes('/auth/csrf')) return json({ csrfToken: 'tok' })
      if (u.includes('/playground/runs')) {
        return json({ data: m.runs, page: 1, pageSize: 10, total: m.runs.length, totalPages: 1 })
      }
      if (u.includes('/playground/organizations')) {
        return json({ data: [], page: 1, pageSize: 50, total: 0, totalPages: 1 })
      }
      return json({})
    }),
  )
}

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/plataforma/playground/vigilar?vista=turnos']}>
        <RunsTab
          origin="user"
          kind={undefined}
          organizationId=""
          page={1}
          onPage={() => {}}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  m.runs = []
  sessionStorage.clear()
  stubApi()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test('cada corrida se lee con su coste y cómo salió', async () => {
  m.runs = [summary()]
  mount()

  expect(await screen.findAllByText('claude-sonnet-5')).not.toHaveLength(0)
  expect(screen.getAllByText('USD 0,0032').length).toBeGreaterThan(0)
  expect(screen.getAllByText('Contestó').length).toBeGreaterThan(0)
})

test('un turno sin tokens ni precio no se rellena con ceros', async () => {
  m.runs = [
    summary({
      id: 'tr2',
      usage: { input: null, output: null, cacheRead: null, cacheWrite: null, noCache: null, reasoning: null },
      costMicroUsd: null,
    }),
  ]
  mount()

  await screen.findAllByText('claude-sonnet-5')
  expect(screen.queryByText('USD 0,0000')).not.toBeInTheDocument()
  expect(screen.queryByText('0')).not.toBeInTheDocument()
})

test('un turno que falló se distingue de uno que alguien detuvo', async () => {
  // Detener es una decisión, no un fallo (§45).
  m.runs = [summary({ id: 'a', failed: true }), summary({ id: 'b', stopped: true })]
  mount()

  expect(await screen.findAllByText('Falló')).not.toHaveLength(0)
  expect(screen.getAllByText('Detenido').length).toBeGreaterThan(0)
})

test('una cifra sin respaldo se avisa aunque el turno contestara', async () => {
  m.runs = [summary({ groundingViolated: true })]
  mount()

  expect(await screen.findAllByText('Cifra sin respaldo')).not.toHaveLength(0)
})
