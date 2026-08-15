import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { ProtectedRoute } from './protected-route'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

const DEMO_USER = {
  id: '1',
  email: 'demo@nummo.app',
  fullName: 'Demo',
  status: 'ACTIVE',
  lastLoginAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function mountGuard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [
      { element: <ProtectedRoute />, children: [{ index: true, element: <div>ZONA PRIVADA</div> }] },
      { path: '/login', element: <div>PANTALLA LOGIN</div> },
    ],
    { initialEntries: ['/'] },
  )
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

test('con sesión válida renderiza el contenido protegido', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => json(DEMO_USER, 200)))
  mountGuard()
  expect(await screen.findByText('ZONA PRIVADA')).toBeInTheDocument()
})

test('sin sesión (401) redirige a login', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => json({ error: { code: 'UNAUTHENTICATED', message: 'no' } }, 401)),
  )
  mountGuard()
  expect(await screen.findByText('PANTALLA LOGIN')).toBeInTheDocument()
})
