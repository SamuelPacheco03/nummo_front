import { afterEach, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { DetailDrawer } from './detail-drawer'

afterEach(cleanup)

/**
 * **Cerrar una ficha devuelve a la lista tal como estaba** (§21.1).
 *
 * La lista no se desmonta —la ficha es una ruta hija que abre encima—, así que
 * sus filtros no se «recuerdan» al volver: se leen de la URL en cada render. Si
 * el cierre navega solo al `pathname`, la lista aparece sin criterios y con las
 * fichas de estado en «Todos», que es justo lo que se estaba mirando y ya no.
 */

/** La ruta actual, que es sobre lo que afirman estas pruebas. */
function Ruta() {
  const { pathname, search } = useLocation()
  return <p>{pathname + search}</p>
}

function pintar(ruta: string, closeTo: string) {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Ruta />
      <Routes>
        <Route
          path="*"
          element={
            <DetailDrawer closeTo={closeTo} title="Ficha">
              Contenido
            </DetailDrawer>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

test('cerrar devuelve a la lista con los criterios que traía', async () => {
  pintar('/cartera/cxc/r1?estado=OVERDUE&pagina=2', '/cartera/cxc')

  await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }))

  expect(screen.getByText('/cartera/cxc?estado=OVERDUE&pagina=2')).toBeInTheDocument()
})

test('sin criterios, vuelve a la lista y nada más', async () => {
  pintar('/contactos/c1', '/contactos')

  await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }))

  expect(screen.getByText('/contactos')).toBeInTheDocument()
})

test('si el cierre lleva a otra sección, los criterios no la siguen', async () => {
  /*
    Registrar un egreso desde una cuenta por pagar cierra hacia la cuenta, no
    hacia la lista de egresos. Las claves se llaman igual en las dos pantallas
    —`estado`, `orden`, `pagina`—, así que arrastrarlas filtraría una lista que
    no es la suya.
  */
  pintar('/gastos/egresos/nuevo?estado=POSTED', '/gastos/cxp/e1')

  await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }))

  expect(screen.getByText('/gastos/cxp/e1')).toBeInTheDocument()
})
