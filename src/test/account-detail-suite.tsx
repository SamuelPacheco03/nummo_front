import { expect, test, type Mock } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import type { ComponentType } from 'react'

/**
 * **La misma suite para las dos fichas de cartera.**
 *
 * La ficha de una cuenta por cobrar y la de una por pagar comparten el
 * esqueleto: el encabezado con el saldo como cifra protagonista, el desglose,
 * el detalle, el botón de saldar y el menú de cerrar la cuenta. Se prueban una
 * sola vez y solo cambian las palabras.
 *
 * Lo que **no** entra aquí es lo que solo tiene un lado —mora, causaciones y
 * ajustes son de cobrar, porque a un proveedor no se le cobran intereses—; eso
 * se prueba en el archivo de esa cara.
 *
 * Nació como **red para extraer la ficha común**: se escribió contra las dos
 * páginas tal como estaban y tuvo que seguir pasando **sin tocarla** con la
 * ficha ya compartida.
 */
export interface AccountDetailCase {
  Page: ComponentType
  /** «No se encontró la cuenta.» / «No se encontró el gasto.» */
  noEncontrado: RegExp
  /** Rótulo de la fecha de emisión: «Emitida» / «Emitido». */
  emitida: string
  /** Botón principal: «Registrar pago» / «Registrar egreso». */
  registrar: string
  /** Comienzo del enlace de ese botón, con la contraparte ya puesta. */
  registrarHref: string
  /** Opción del menú: «Cancelar cuenta» / «Cancelar gasto». */
  cancelarItem: string
  /** Título de su confirmación. */
  cancelarTitulo: string
  /** Aviso al cancelar. */
  cancelado: string
  /** Título de la confirmación de castigar. */
  castigarTitulo: string
  /** Aviso al castigar. */
  castigado: string
  cancelar: () => Mock
  castigar: () => Mock
  avisos: () => { tono: string; texto: string }[]
  conError: () => void
  cerrada: () => void
  soloLectura: () => void
}

function pintar(Page: ComponentType) {
  render(
    <MemoryRouter initialEntries={['/ficha']}>
      <Page />
    </MemoryRouter>,
  )
}

/** Abre el menú «Más» y devuelve su contenido. */
async function abrirMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Más' }))
  return screen.getByRole('menu')
}

export function runAccountDetailSuite(c: AccountDetailCase) {
  test('encabeza con la contraparte, su concepto y el saldo', () => {
    pintar(c.Page)

    expect(screen.getByRole('heading', { name: 'Ana Torres' })).toBeInTheDocument()
    expect(screen.getByText('Mensualidad')).toBeInTheDocument()
    // La cifra grande es el saldo, no el valor original (§).
    expect(screen.getAllByText('$400.000,00').length).toBeGreaterThan(0)
  })

  test('desglosa el saldo: valor original, lo pagado y lo que queda', () => {
    pintar(c.Page)

    expect(screen.getByText('Valor original')).toBeInTheDocument()
    expect(screen.getByText('$1.000.000,00')).toBeInTheDocument()
    expect(screen.getByText('Pagado')).toBeInTheDocument()
    expect(screen.getByText(/600\.000,00/)).toBeInTheDocument()
  })

  test('muestra el detalle de la cuenta', () => {
    pintar(c.Page)

    expect(screen.getByText('Vence')).toBeInTheDocument()
    expect(screen.getByText(c.emitida)).toBeInTheDocument()
    expect(screen.getByText('Con nota')).toBeInTheDocument()
  })

  test('el botón principal lleva al formulario con la contraparte puesta', () => {
    pintar(c.Page)

    const enlace = screen.getByRole('link', { name: c.registrar })
    expect(enlace.getAttribute('href')).toContain(c.registrarHref)
    // Y con por dónde volver, para no dejar a nadie en la lista equivocada.
    expect(enlace.getAttribute('href')).toContain('volver=%2Fficha')
  })

  test('una cuenta cerrada ya no se salda ni se cierra otra vez', () => {
    c.cerrada()
    pintar(c.Page)

    expect(screen.queryByRole('link', { name: c.registrar })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Más' })).not.toBeInTheDocument()
  })

  test('cancelar la cuenta pide confirmación y avisa al terminar', async () => {
    const user = userEvent.setup()
    pintar(c.Page)

    await user.click(within(await abrirMenu(user)).getByRole('menuitem', { name: c.cancelarItem }))
    const confirmacion = screen.getByRole('dialog')
    expect(within(confirmacion).getByRole('heading', { name: c.cancelarTitulo })).toBeInTheDocument()
    await user.click(within(confirmacion).getByRole('button', { name: c.cancelarItem }))

    await waitFor(() => expect(c.cancelar()).toHaveBeenCalledTimes(1))
    expect(c.cancelar().mock.calls[0][0]).toMatchObject({ orgId: 'o1', id: 'a1' })
    expect(c.avisos().at(-1)).toEqual({ tono: 'success', texto: c.cancelado })
  })

  test('castigar la cuenta pide confirmación y avisa al terminar', async () => {
    const user = userEvent.setup()
    pintar(c.Page)

    await user.click(within(await abrirMenu(user)).getByRole('menuitem', { name: 'Castigar' }))
    const confirmacion = screen.getByRole('dialog')
    expect(within(confirmacion).getByRole('heading', { name: c.castigarTitulo })).toBeInTheDocument()
    await user.click(within(confirmacion).getByRole('button', { name: 'Castigar' }))

    await waitFor(() => expect(c.castigar()).toHaveBeenCalledTimes(1))
    expect(c.avisos().at(-1)).toEqual({ tono: 'success', texto: c.castigado })
  })

  test('quien solo mira no ve ninguna acción', () => {
    c.soloLectura()
    pintar(c.Page)

    expect(screen.queryByRole('link', { name: c.registrar })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Más' })).not.toBeInTheDocument()
  })

  test('si la cuenta no carga, lo dice en su sitio', () => {
    c.conError()
    pintar(c.Page)

    expect(screen.getByText(c.noEncontrado)).toBeInTheDocument()
  })
}
