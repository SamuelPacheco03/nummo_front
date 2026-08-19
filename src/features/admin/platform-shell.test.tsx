import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'

const acceso = vi.hoisted(() => ({
  isPlatformAdmin: false,
  isLoading: false,
  isError: false,
  error: null as unknown,
}))
const orgs = vi.hoisted(() => ({ current: [] as unknown[] }))
vi.mock('@/features/platform/hooks', () => ({ usePlatformAccess: () => acceso }))
// El shell solo pregunta por las organizaciones para saber si hay a dónde volver.
vi.mock('@/features/organizations/hooks', () => ({
  useCurrentOrg: () => ({ organizations: orgs.current }),
}))
vi.mock('@/features/auth/user-menu', () => ({ UserMenu: () => null }))

const { PlatformShell } = await import('./platform-shell')

function pintar() {
  return render(
    <MemoryRouter initialEntries={['/plataforma/organizaciones']}>
      <Routes>
        <Route path="/plataforma" element={<PlatformShell />}>
          <Route path="organizaciones" element={<p>Listado de organizaciones</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  acceso.isPlatformAdmin = false
  acceso.isLoading = false
  acceso.isError = false
  acceso.error = null
  orgs.current = []
  cleanup()
})

test('sin acceso de plataforma se explica, no se redirige a escondidas', () => {
  // Quien llegue por un enlace viejo merece saber qué pasó; y el guard de verdad
  // está en el backend, que revalida cada petición a /admin.
  pintar()

  expect(screen.getByText('Esta sección es de la plataforma')).toBeInTheDocument()
  expect(screen.queryByText('Listado de organizaciones')).not.toBeInTheDocument()
})

test('con acceso se monta la consola con su navegación', () => {
  acceso.isPlatformAdmin = true
  pintar()

  expect(screen.getByText('Listado de organizaciones')).toBeInTheDocument()
  expect(screen.getAllByRole('link', { name: 'Organizaciones' }).length).toBeGreaterThan(0)
})

test('mientras se resuelve el acceso no se enseña ninguna de las dos cosas', () => {
  // Pintar el «no tienes acceso» un instante antes de saberlo es el parpadeo de
  // §45.2, y aquí acusa de algo que no ha pasado.
  acceso.isLoading = true
  pintar()

  expect(screen.queryByText('Esta sección es de la plataforma')).not.toBeInTheDocument()
  expect(screen.queryByText('Listado de organizaciones')).not.toBeInTheDocument()
})

test('no poder preguntar no se cuenta como que te dijeron que no', () => {
  // Contra un backend que todavía no publica la señal, un superadmin de verdad
  // vería «no tienes acceso» y se pondría a buscar el problema en su cuenta.
  acceso.isError = true
  acceso.error = new Error('Not Found')
  pintar()

  expect(screen.getByText('No se pudo comprobar el acceso de plataforma')).toBeInTheDocument()
  expect(screen.queryByText('Esta sección es de la plataforma')).not.toBeInTheDocument()
})

test('sin organización propia la consola se abre igual', () => {
  /*
    El fallo que esto fija: la consola vivía dentro del shell de la aplicación,
    que empieza por «¿a qué organización perteneces?» y enseña el onboarding a
    quien no pertenece a ninguna. Un superadmin no tiene por qué tener una —
    administra todas—, así que `/plataforma` acababa en «Crea tu organización».
  */
  acceso.isPlatformAdmin = true
  orgs.current = []
  pintar()

  expect(screen.getByText('Listado de organizaciones')).toBeInTheDocument()
  expect(screen.queryByText(/Crea tu organización/)).not.toBeInTheDocument()
  // Y sin organización propia no se ofrece volver a ninguna parte.
  expect(screen.queryByRole('link', { name: /volver a nummo/i })).not.toBeInTheDocument()
})

test('con organización propia se puede volver a la aplicación', () => {
  acceso.isPlatformAdmin = true
  orgs.current = [{ organization: { id: 'o1' }, role: 'OWNER' }]
  pintar()

  expect(screen.getByRole('link', { name: /volver a nummo/i })).toHaveAttribute('href', '/')
})
