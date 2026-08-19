import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'

const acceso = vi.hoisted(() => ({ isPlatformAdmin: false, isLoading: false }))
vi.mock('@/features/platform/hooks', () => ({ usePlatformAccess: () => acceso }))

const { PlatformLayout } = await import('./platform-layout')

function pintar() {
  return render(
    <MemoryRouter initialEntries={['/plataforma/organizaciones']}>
      <Routes>
        <Route path="/plataforma" element={<PlatformLayout />}>
          <Route path="organizaciones" element={<p>Listado de organizaciones</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  acceso.isPlatformAdmin = false
  acceso.isLoading = false
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
