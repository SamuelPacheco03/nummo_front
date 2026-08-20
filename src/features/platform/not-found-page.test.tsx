import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { NotFoundPage } from './not-found-page'

/** Dice en qué ruta acabó la navegación, que es lo que aquí se comprueba. */
function Ruta() {
  const { pathname } = useLocation()
  return <p>estoy en {pathname}</p>
}

function montar(entrada: string) {
  render(
    <MemoryRouter initialEntries={[entrada]}>
      <Routes>
        <Route path="/cartera/cxc/:id" element={<Ruta />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

test('un destino del contrato acaba en su ficha, no en el 404', () => {
  /*
    Es el camino de Web Push: el service worker es un script clásico que abre la
    URL tal cual, sin router al que preguntar, así que la traducción tiene que
    poder ocurrir también al aterrizar (§95.16).
  */
  montar('/cartera/cobros/r1')

  expect(screen.getByText('estoy en /cartera/cxc/r1')).toBeVisible()
})

test('una ruta que no existe se explica y ofrece salir', () => {
  // Sin esto el router enseñaba su propia pantalla de error, en inglés y sin la
  // navegación de la aplicación.
  montar('/lo-que-sea')

  expect(screen.getByText('No encontramos esa pantalla')).toBeVisible()
  expect(screen.getByRole('link', { name: 'Ir al inicio' })).toHaveAttribute('href', '/')
})
