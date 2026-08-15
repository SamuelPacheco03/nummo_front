import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import { RegisterPage } from './register-page'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

const UNAUTH = { error: { code: 'UNAUTHENTICATED', message: 'no' } }
const NEW_USER = {
  id: '2',
  email: 'nueva@empresa.com',
  fullName: 'Persona Nueva',
  status: 'ACTIVE',
  lastLoginAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function mountRegister() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<div>PANTALLA LOGIN</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

test('valida los campos requeridos (incluida contraseña mínima)', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => (String(url).includes('/auth/me') ? json(UNAUTH, 401) : json({}, 200))),
  )
  const user = userEvent.setup()
  mountRegister()
  await user.click(await screen.findByRole('button', { name: 'Crear cuenta' }))
  expect(await screen.findByText('Ingresa tu nombre')).toBeInTheDocument()
  expect(await screen.findByText('Ingresa tu email')).toBeInTheDocument()
  expect(await screen.findByText('Mínimo 8 caracteres')).toBeInTheDocument()
})

test('registro exitoso lleva al login', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const u = String(url)
      if (u.includes('/auth/me')) return json(UNAUTH, 401)
      if (u.includes('/auth/csrf')) return json({ csrfToken: 'tok' }, 200)
      if (u.includes('/auth/register')) return json(NEW_USER, 201)
      return json({}, 200)
    }),
  )
  const user = userEvent.setup()
  mountRegister()
  await user.type(await screen.findByLabelText('Nombre completo'), 'Persona Nueva')
  await user.type(screen.getByLabelText('Email'), 'nueva@empresa.com')
  await user.type(screen.getByLabelText('Contraseña'), 'Segura123')
  await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))
  expect(await screen.findByText('PANTALLA LOGIN')).toBeInTheDocument()
})

test('rate-limit (429) muestra un mensaje amable', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const u = String(url)
      if (u.includes('/auth/me')) return json(UNAUTH, 401)
      if (u.includes('/auth/csrf')) return json({ csrfToken: 'tok' }, 200)
      if (u.includes('/auth/register')) return json({ error: { code: 'RATE_LIMITED', message: 'slow down' } }, 429)
      return json({}, 200)
    }),
  )
  const user = userEvent.setup()
  mountRegister()
  await user.type(await screen.findByLabelText('Nombre completo'), 'Persona Nueva')
  await user.type(screen.getByLabelText('Email'), 'nueva@empresa.com')
  await user.type(screen.getByLabelText('Contraseña'), 'Segura123')
  await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))
  expect(await screen.findByText(/Demasiados intentos/i)).toBeInTheDocument()
})
