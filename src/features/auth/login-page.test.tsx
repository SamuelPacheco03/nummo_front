import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import { LoginPage } from './login-page'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

const UNAUTH = { error: { code: 'UNAUTHENTICATED', message: 'no' } }
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

function mountLogin() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<div>PANTALLA HOME</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

test('valida los campos requeridos', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      String(url).includes('/auth/me') ? json(UNAUTH, 401) : json({}, 200),
    ),
  )
  const user = userEvent.setup()
  mountLogin()
  await user.click(await screen.findByRole('button', { name: 'Entrar' }))
  expect(await screen.findByText('Ingresa tu email')).toBeInTheDocument()
  expect(await screen.findByText('Ingresa tu contraseña')).toBeInTheDocument()
})

test('login exitoso navega al home', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const u = String(url)
      if (u.includes('/auth/me')) return json(UNAUTH, 401)
      if (u.includes('/auth/csrf')) return json({ csrfToken: 'tok' }, 200)
      if (u.includes('/auth/login')) return json(DEMO_USER, 200)
      return json({}, 200)
    }),
  )
  const user = userEvent.setup()
  mountLogin()
  await user.type(await screen.findByLabelText('Email'), 'demo@nummo.app')
  await user.type(screen.getByLabelText('Contraseña'), 'Demo1234!')
  await user.click(screen.getByRole('button', { name: 'Entrar' }))
  expect(await screen.findByText('PANTALLA HOME')).toBeInTheDocument()
})

test('credenciales inválidas muestran el error', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const u = String(url)
      if (u.includes('/auth/me')) return json(UNAUTH, 401)
      if (u.includes('/auth/csrf')) return json({ csrfToken: 'tok' }, 200)
      if (u.includes('/auth/login'))
        return json({ error: { code: 'UNAUTHENTICATED', message: 'Credenciales inválidas' } }, 401)
      return json({}, 200)
    }),
  )
  const user = userEvent.setup()
  mountLogin()
  await user.type(await screen.findByLabelText('Email'), 'demo@nummo.app')
  await user.type(screen.getByLabelText('Contraseña'), 'malo')
  await user.click(screen.getByRole('button', { name: 'Entrar' }))
  expect(await screen.findByText('Credenciales inválidas')).toBeInTheDocument()
})
