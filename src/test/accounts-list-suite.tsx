import { beforeEach, expect, test } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import type { ComponentType } from 'react'

/**
 * **La misma suite para las dos caras de la cartera.**
 *
 * Cuentas por cobrar y cuentas por pagar son la misma pantalla mirada desde los
 * dos lados, así que se prueban con las mismas afirmaciones y solo cambian las
 * palabras. Escribirla dos veces habría sido repetir en los tests el duplicado
 * que se está quitando del código.
 *
 * Nació como **red para extraer el componente común**: se escribió contra las
 * dos páginas tal como estaban, y tuvo que seguir pasando **sin tocarla** con la
 * pantalla ya reescrita. Por eso no mira estructura interna —qué componente
 * pinta qué— sino lo que el usuario ve y lo que sale hacia el API.
 */
export interface AccountsListCase {
  Page: ComponentType
  /** Cómo se llama la pantalla y su gente, para las aserciones de texto. */
  titulo: string
  contacto: string
  catalogo: string
  buscarPor: RegExp
  vacio: RegExp
  entidad: string
  /** Ruta del detalle a la que debe navegar al pulsar una fila. */
  detalle: string
  /** Último `params` con el que se llamó al hook de listado. */
  ultimosParams: () => Record<string, unknown> | undefined
  /** Clave del filtro de contraparte en la URL (`pagador` / `proveedor`). */
  claveContacto: string
}

function pintar(Page: ComponentType, ruta = '/') {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/*" element={<Page />} />
      </Routes>
    </MemoryRouter>,
  )
}

export function runAccountsListSuite(c: AccountsListCase) {
  /*
    Los filtros de un listado se recuerdan en `sessionStorage` (§21.1), así que
    un test que navega con criterios se los deja puestos al siguiente. Es el
    comportamiento correcto de la app y el equivocado para una prueba: cada una
    empieza sin memoria.
  */
  beforeEach(() => sessionStorage.clear())

  test('enseña cada cuenta con su contraparte, su catálogo, su estado y su saldo', async () => {
    pintar(c.Page)
    expect(await screen.findByRole('heading', { name: c.titulo })).toBeInTheDocument()

    // `DataList` monta la tabla y las tarjetas a la vez y las esconde por CSS,
    // así que cada dato aparece dos veces en el DOM. Basta con la primera.
    expect(screen.getAllByText('Ana Torres').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/350\.000/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(c.catalogo).length).toBeGreaterThan(0)
  })

  test('ofrece buscar, filtrar por estado y abrir los filtros avanzados', async () => {
    pintar(c.Page)
    await screen.findByRole('heading', { name: c.titulo })

    expect(screen.getByPlaceholderText(c.buscarPor)).toBeInTheDocument()
    for (const chip of ['Todas', 'Vencidas', 'Pendientes', 'Parciales']) {
      expect(screen.getByRole('radio', { name: new RegExp(chip) })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: /filtros/i })).toBeInTheDocument()
  })

  test('el estado elegido viaja al API y vuelve a la primera página', async () => {
    pintar(c.Page, '/?pagina=3')
    await screen.findByRole('heading', { name: c.titulo })

    await userEvent.click(screen.getByRole('radio', { name: /Vencidas/ }))
    await waitFor(() => expect(c.ultimosParams()?.displayStatus).toBe('OVERDUE'))
    // Filtrar desde la página 3 y quedarse en la 3 enseñaría un vacío que no lo es.
    expect(c.ultimosParams()?.page).toBe(1)
  })

  test('los criterios de la URL se respetan al entrar por enlace', async () => {
    pintar(c.Page, `/?estado=PAID&${c.claveContacto}=c1&orden=balance&dir=desc&pagina=2`)
    await screen.findByRole('heading', { name: c.titulo })

    await waitFor(() => {
      const p = c.ultimosParams()
      expect(p?.displayStatus).toBe('PAID')
      expect(p?.sort).toBe('balance')
      expect(p?.order).toBe('desc')
      expect(p?.page).toBe(2)
    })
  })

  test('al pulsar una fila abre su ficha', async () => {
    pintar(c.Page)
    await screen.findByRole('heading', { name: c.titulo })

    await userEvent.click(screen.getAllByText('Ana Torres')[0] as HTMLElement)
    await waitFor(() => expect(window.__ultimaRuta).toBe(c.detalle))
  })

  test('sin nada que enseñar invita a crear', async () => {
    window.__listaVacia = true
    pintar(c.Page)
    expect((await screen.findAllByText(c.vacio)).length).toBeGreaterThan(0)
  })

  test('con filtros puestos no es que no haya nada: es que no hay nada así', async () => {
    window.__listaVacia = true
    pintar(c.Page, '/?estado=PAID')
    const sinResultados = await screen.findAllByText(new RegExp(`Sin resultados|No hay ${c.entidad}`, 'i'))
    expect(sinResultados.length).toBeGreaterThan(0)
    // Y ofrece la salida: quitar los filtros, no crear una cuenta.
    expect(screen.queryAllByText(c.vacio)).toHaveLength(0)
  })

  test('si la lista falla lo dice, y no finge una cartera vacía', async () => {
    window.__listaFalla = true
    pintar(c.Page)
    expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudo cargar/i)
    expect(screen.queryByText(c.vacio)).not.toBeInTheDocument()
    window.__listaFalla = false
  })
}

declare global {
  interface Window {
    __ultimaRuta?: string
    __listaVacia?: boolean
    __listaFalla?: boolean
  }
}
