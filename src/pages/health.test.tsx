import { afterEach, expect, test, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HealthPage } from '@/pages/health'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function stubFetch(body: unknown, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify(body), {
          status,
          headers: { 'content-type': 'application/json' },
        }),
    ),
  )
}

function renderHealth() {
  // Sin reintentos en tests: el caso de error no espera el backoff.
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <HealthPage />
    </QueryClientProvider>,
  )
}

test('muestra el estado operativo cuando el backend responde ok', async () => {
  stubFetch({
    status: 'ok',
    db: 'up',
    uptimeSeconds: 3661,
    timestamp: '2026-08-13T10:00:00.000Z',
    version: '0.1.0',
  })

  renderHealth()

  expect(await screen.findByText('Operativo')).toBeInTheDocument()
  expect(await screen.findByText('0.1.0')).toBeInTheDocument()
  expect(screen.getByText('Conectada')).toBeInTheDocument()
})

test('muestra el error cuando el backend falla', async () => {
  stubFetch({ error: { code: 'INTERNAL', message: 'boom' } }, 500)

  renderHealth()

  expect(await screen.findByText('Backend no disponible')).toBeInTheDocument()
  expect(await screen.findByText('code: INTERNAL')).toBeInTheDocument()
})
