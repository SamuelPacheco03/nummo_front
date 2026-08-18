import { expect, test, type Mock } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import type { ComponentType } from 'react'

/**
 * **La misma suite para las dos fichas de movimiento.**
 *
 * La ficha de un pago y la de un egreso son la misma pantalla mirada desde los
 * dos lados: el mismo encabezado, el mismo aviso de crédito sin asignar, la
 * misma lista de aplicaciones y la misma reversión. Se prueban una sola vez y
 * solo cambian las palabras y a dónde apunta cada enlace.
 *
 * Nació como **red para extraer la ficha común**: se escribió contra las dos
 * páginas tal como estaban y tuvo que seguir pasando **sin tocarla** con la
 * ficha ya compartida. Por eso mira lo que se ve y lo que sale hacia el API,
 * nunca qué componente pinta qué.
 */
export interface SettlementDetailCase {
  Page: ComponentType
  /** «No se encontró el pago.» */
  noEncontrado: RegExp
  /** Rótulo de la fecha del movimiento: «Recibido» / «Fecha». */
  fecha: string
  /** Título de la sección de aplicaciones, sin el contador. */
  aplicado: string
  /** Texto del enlace de cada aplicación: «Ver cuenta» / «Ver gasto». */
  verLink: string
  /** A dónde lleva ese enlace. */
  hrefAplicacion: string
  /** Título de la confirmación: «Revertir pago» / «Revertir egreso». */
  revertirTitulo: string
  /** Aviso al reversar: «Pago reversado» / «Egreso reversado». */
  revertido: string
  /** El `mutateAsync` simulado de la reversión. */
  revertir: () => Mock
  /** Los avisos que se dispararon, en orden. */
  avisos: () => { tono: string; texto: string }[]
  /** Interruptores del escenario, antes de pintar. */
  conError: () => void
  conReverso: () => void
  sinCredito: () => void
  sinAplicaciones: () => void
  soloLectura: () => void
}

function pintar(Page: ComponentType) {
  render(
    <MemoryRouter>
      <Page />
    </MemoryRouter>,
  )
}

export function runSettlementDetailSuite(c: SettlementDetailCase) {
  test('encabeza con la contraparte, el propósito y el importe', () => {
    pintar(c.Page)

    expect(screen.getByRole('heading', { name: 'Ana Torres' })).toBeInTheDocument()
    expect(screen.getByText('Anticipo')).toBeInTheDocument()
    expect(screen.getByText('$800.000,00')).toBeInTheDocument()
  })

  test('resume la fecha, el método, la referencia y las notas', () => {
    pintar(c.Page)

    expect(screen.getByText(c.fecha)).toBeInTheDocument()
    expect(screen.getByText('Transferencia')).toBeInTheDocument()
    expect(screen.getByText('REF-9')).toBeInTheDocument()
    expect(screen.getByText('Con nota')).toBeInTheDocument()
  })

  test('avisa del crédito sin asignar y ofrece repartirlo', () => {
    pintar(c.Page)

    expect(screen.getByText(/Crédito sin asignar/)).toBeInTheDocument()
    expect(screen.getByText('$500.000,00')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aplicar anticipo' })).toBeInTheDocument()
  })

  test('sin crédito pendiente no hay aviso ni reparto', () => {
    c.sinCredito()
    pintar(c.Page)

    expect(screen.queryByText(/Crédito sin asignar/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aplicar anticipo' })).not.toBeInTheDocument()
  })

  test('lista las aplicaciones con su enlace y su importe', () => {
    pintar(c.Page)

    expect(screen.getByRole('heading', { name: `${c.aplicado} (1)` })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: c.verLink })).toHaveAttribute(
      'href',
      c.hrefAplicacion,
    )
    expect(screen.getByText('$300.000,00')).toBeInTheDocument()
  })

  test('sin aplicaciones lo dice', () => {
    c.sinAplicaciones()
    pintar(c.Page)

    expect(screen.getByRole('heading', { name: `${c.aplicado} (0)` })).toBeInTheDocument()
    expect(screen.getByText('Sin asignaciones.')).toBeInTheDocument()
  })

  test('un movimiento reversado no se puede volver a tocar', () => {
    c.conReverso()
    pintar(c.Page)

    expect(screen.queryByRole('button', { name: 'Revertir' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aplicar anticipo' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Crédito sin asignar/)).not.toBeInTheDocument()
  })

  test('revertir pide confirmación y avisa al terminar', async () => {
    const user = userEvent.setup()
    pintar(c.Page)

    await user.click(screen.getByRole('button', { name: 'Revertir' }))
    const confirmacion = screen.getByRole('dialog')
    expect(within(confirmacion).getByText(c.revertirTitulo)).toBeInTheDocument()

    await user.click(within(confirmacion).getByRole('button', { name: 'Revertir' }))

    await waitFor(() => expect(c.revertir()).toHaveBeenCalledTimes(1))
    expect(c.revertir().mock.calls[0][0]).toMatchObject({ orgId: 'o1', id: 'm1' })
    expect(c.avisos().at(-1)).toEqual({ tono: 'success', texto: c.revertido })
  })

  test('quien solo mira no ve ninguna acción', () => {
    c.soloLectura()
    pintar(c.Page)

    expect(screen.queryByRole('button', { name: 'Revertir' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aplicar anticipo' })).not.toBeInTheDocument()
  })

  test('si el movimiento no carga, lo dice en su sitio', () => {
    c.conError()
    pintar(c.Page)

    expect(screen.getByText(c.noEncontrado)).toBeInTheDocument()
  })
}
