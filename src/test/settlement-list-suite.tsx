import { beforeEach, expect, test } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import type { ComponentType } from 'react'

/**
 * **La misma suite para las dos caras del dinero registrado.**
 *
 * Pagos y egresos son la misma pantalla mirada desde los dos lados —comparten
 * `SettlementList` (§94.0)—, así que se prueban con las mismas afirmaciones y
 * solo cambian las palabras, el endpoint y el nombre que el contrato le da a la
 * fecha. Escribirla dos veces habría sido repetir en los tests el duplicado que
 * el componente vino a quitar.
 *
 * Llega **después** de la extracción y no como red para hacerla, así que su
 * trabajo es otro: sujetar lo que ya se había separado sin que nadie lo notara.
 * La lista ordenaba por «Monto» y no por «Fecha» —la columna se llama `date` y
 * el contrato `receivedAt` / `disbursedAt`— y ninguna prueba lo veía porque
 * ninguna miraba esta pantalla. Por eso el orden se comprueba **por el nombre
 * del campo que viaja al API**, que es donde el fallo vivía.
 *
 * Como la de cartera, no mira estructura interna: lo que el usuario ve y lo que
 * sale hacia el API.
 */
export interface SettlementListCase {
  Page: ComponentType
  /** «Pagos» / «Egresos». */
  titulo: string
  /** Marcador del buscador, que nombra a la contraparte de este lado. */
  buscarPor: RegExp
  /** «Registrar pago» / «Registrar egreso». */
  registrar: string
  vacio: RegExp
  /** Cómo se llaman en un vacío con filtros: «pagos» / «egresos». */
  entidad: string
  /** Ruta de la ficha a la que debe navegar al pulsar una fila. */
  detalle: string
  /**
   * **Los estados que ofrece este lado**, en orden y con sus palabras.
   *
   * Es la diferencia real entre las dos caras (§94.0): un egreso puede quedar
   * esperando firma o rechazado, y un pago que entra no lo aprueba nadie. La
   * suite comprueba que cada lado ofrece los suyos y **solo** los suyos.
   */
  estados: { valor: string; etiqueta: string }[]
  /** Un propósito que acepta este endpoint, para el filtro del cajón. */
  proposito: string
  /** Etiqueta del propósito de la fila, tal como se lee en la lista. */
  propositoFila: string
  /** Cómo llama el contrato a la fecha: `receivedAt` / `disbursedAt` (§18.1). */
  campoFecha: string
  /** Cómo llama el endpoint al filtro de contraparte. */
  claveContactoApi: string
  /** Último `params` con el que se llamó al hook de listado. */
  ultimosParams: () => Record<string, unknown> | undefined
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

export function runSettlementListSuite(c: SettlementListCase) {
  /*
    Los filtros se recuerdan en `sessionStorage` (§21.1), así que un test que
    navega con criterios se los deja puestos al siguiente. Es el comportamiento
    correcto de la app y el equivocado para una prueba.
  */
  beforeEach(() => sessionStorage.clear())

  test('enseña cada movimiento con su contraparte, su tipo, su estado y su monto', async () => {
    pintar(c.Page)
    expect(await screen.findByRole('heading', { name: c.titulo })).toBeInTheDocument()

    // `DataList` monta la tabla y las tarjetas a la vez y las esconde por CSS,
    // así que cada dato aparece dos veces en el DOM. Basta con la primera.
    expect(screen.getAllByText('Ana Torres').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/350\.000/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(c.propositoFila).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Registrado').length).toBeGreaterThan(0)
  })

  test('ofrece buscar, los estados de este lado y el cajón de filtros', async () => {
    pintar(c.Page)
    await screen.findByRole('heading', { name: c.titulo })

    expect(screen.getByPlaceholderText(c.buscarPor)).toBeInTheDocument()

    // Los suyos y **solo** los suyos: ofrecerle a pagos los estados de
    // aprobación sería enseñar dos filtros que su endpoint rechaza (§94.0).
    const fichas = within(screen.getByRole('radiogroup', { name: 'Estado' })).getAllByRole('radio')
    expect(fichas.map((f) => f.textContent)).toEqual([
      'Todos',
      ...c.estados.map((e) => e.etiqueta),
    ])

    expect(screen.getByRole('button', { name: /filtros/i })).toBeInTheDocument()
  })

  test('el estado elegido viaja al API y vuelve a la primera página', async () => {
    pintar(c.Page, '/?pagina=3')
    await screen.findByRole('heading', { name: c.titulo })

    const primero = c.estados[0]!
    await userEvent.click(screen.getByRole('radio', { name: primero.etiqueta }))
    await waitFor(() => expect(c.ultimosParams()?.status).toBe(primero.valor))
    // Filtrar desde la página 3 y quedarse en la 3 enseñaría un vacío que no lo es.
    expect(c.ultimosParams()?.page).toBe(1)
  })

  test('los criterios de la URL se respetan al entrar por enlace', async () => {
    pintar(
      c.Page,
      `/?estado=REVERSED&contacto=c1&proposito=${c.proposito}&orden=amount&dir=asc&pagina=2`,
    )
    await screen.findByRole('heading', { name: c.titulo })

    await waitFor(() => {
      const p = c.ultimosParams()
      expect(p?.status).toBe('REVERSED')
      expect(p?.[c.claveContactoApi]).toBe('c1')
      expect(p?.purpose).toBe(c.proposito)
      expect(p?.sort).toBe('amount')
      expect(p?.order).toBe('asc')
      expect(p?.page).toBe(2)
    })
  })

  test('las dos cabeceras ordenan, con el nombre que el contrato le da a cada campo', async () => {
    pintar(c.Page)
    await screen.findByRole('heading', { name: c.titulo })

    // Abre por lo último registrado: la fecha de este contrato, descendente.
    await waitFor(() => expect(c.ultimosParams()?.sort).toBe(c.campoFecha))
    expect(c.ultimosParams()?.order).toBe('desc')

    // Cambiar de columna conserva la dirección (§18.1).
    await userEvent.click(screen.getByRole('button', { name: 'Monto' }))
    await waitFor(() => expect(c.ultimosParams()?.sort).toBe('amount'))
    expect(c.ultimosParams()?.order).toBe('desc')

    // Y la fecha vuelve a ordenar: es la cabecera que estuvo muda porque su
    // columna se llama `date` y el contrato la llama de otra forma.
    await userEvent.click(screen.getByRole('button', { name: 'Fecha' }))
    await waitFor(() => expect(c.ultimosParams()?.sort).toBe(c.campoFecha))
    expect(c.ultimosParams()?.order).toBe('desc')

    // Pulsar la columna ya activa invierte la dirección.
    await userEvent.click(screen.getByRole('button', { name: 'Fecha' }))
    await waitFor(() => expect(c.ultimosParams()?.order).toBe('asc'))
  })

  test('al pulsar una fila abre su ficha', async () => {
    pintar(c.Page)
    await screen.findByRole('heading', { name: c.titulo })

    await userEvent.click(screen.getAllByText('Ana Torres')[0] as HTMLElement)
    await waitFor(() => expect(window.__ultimaRuta).toBe(c.detalle))
  })

  test('sin nada que enseñar invita a registrar', async () => {
    window.__listaVacia = true
    pintar(c.Page)

    expect((await screen.findAllByText(c.vacio)).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: c.registrar }).length).toBeGreaterThan(0)
  })

  test('con filtros puestos no es que no haya nada: es que no hay nada así', async () => {
    window.__listaVacia = true
    pintar(c.Page, '/?estado=REVERSED')

    const sinResultados = await screen.findAllByText(
      new RegExp(`Sin resultados|No hay ${c.entidad}`, 'i'),
    )
    expect(sinResultados.length).toBeGreaterThan(0)
    // Y ofrece la salida: quitar los filtros, no registrar un movimiento.
    expect(screen.queryAllByText(c.vacio)).toHaveLength(0)
  })

  test('si la lista falla lo dice, y no finge que no hubo movimientos', async () => {
    window.__listaFalla = true
    pintar(c.Page)

    // `ErrorState` antepone su título y usa el mensaje del error cuando lo trae;
    // el `loadError` de la pantalla es el respaldo para cuando no lo trae.
    const aviso = await screen.findByRole('alert')
    expect(aviso).toHaveTextContent(/no se pudo cargar/i)
    expect(aviso).toHaveTextContent('Falla del servidor')
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
