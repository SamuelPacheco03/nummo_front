import { expect, test, type Mock } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentType } from 'react'

/**
 * **La misma suite para los dos anticipos.**
 *
 * Aplicar el anticipo de un pago a cuentas por cobrar y aplicar el de un egreso
 * a gastos son la misma operación mirada desde los dos lados: el mismo reparto,
 * la misma aritmética y los mismos avisos. Se prueban una sola vez y solo
 * cambian las palabras y el nombre del campo que viaja al API.
 *
 * Nació como **red para extraer el diálogo común**: se escribió contra los dos
 * diálogos tal como estaban y tuvo que seguir pasando **sin tocarla** con el
 * diálogo ya compartido. Por eso mira lo que ve quien reparte —los saldos, lo
 * que queda de crédito, los avisos— y lo que sale hacia el API, nunca qué
 * componente pinta qué.
 *
 * Se reescribió al pasar el diálogo a **marcar cuentas** (§11.1.17), que es un
 * cambio de lo que la pantalla promete y no una refactorización: lo que antes
 * era «escribe un importe en cada fila» hoy es «marca y, si acaso, ajusta».
 *
 * Los datos son siempre los mismos: $500.000 de crédito sobre cuentas abiertas
 * de 300.000 y 400.000 —más una saldada y otra sin saldo, que no se ofrecen—,
 * todas del concepto «Mensualidad».
 */
export interface ApplyAdvanceCase {
  /** El diálogo montado y abierto, con sus props puestas. */
  Dialog: ComponentType
  /** Aviso cuando no se marcó nada: «Marca al menos una cuenta» / «un gasto». */
  sinAsignar: RegExp
  /** Aviso cuando la contraparte no tiene nada abierto. */
  vacio: RegExp
  /** «Seleccionar todas» / «Seleccionar todos». */
  seleccionarTodas: string
  /** «Se aplica a 2 cuentas» / «… 2 gastos». */
  cubre: RegExp
  /** Cómo llama cada cara a una cuenta vencida: «Vencida» / «Vencido». */
  vencida: string
  /** Nombre del campo que identifica la cuenta en el cuerpo del POST. */
  claveItem: string
  /** El `mutateAsync` simulado del endpoint de reparto. */
  aplicar: () => Mock
  /** Los avisos que se dispararon, en orden. */
  avisos: () => { tono: string; texto: string }[]
  /** Deja el listado sin cuentas abiertas, para el caso vacío. */
  vaciarListado: () => void
  /** Si el diálogo pidió cerrarse. */
  cerrado: () => boolean
}

/** Los campos de monto se distinguen por posición: van en el orden de la lista. */
function montos(): HTMLInputElement[] {
  return screen.getAllByPlaceholderText('0') as HTMLInputElement[]
}

function casillas(): HTMLInputElement[] {
  return screen.getAllByRole('checkbox') as HTMLInputElement[]
}

export function runApplyAdvanceSuite(c: ApplyAdvanceCase) {
  test('muestra el crédito disponible y solo las cuentas abiertas con saldo', () => {
    render(<c.Dialog />)

    expect(screen.getByText(/Crédito disponible/)).toBeInTheDocument()
    // Dos abiertas de las cuatro del listado: ni la pagada ni la de saldo cero
    // se reparten.
    expect(montos()).toHaveLength(2)
    expect(screen.getByText(/Saldo \$300\.000,00/)).toBeInTheDocument()
    expect(screen.getByText(/Saldo \$400\.000,00/)).toBeInTheDocument()
    // Y cada fila dice de qué es y cómo está, no solo cuándo vence.
    expect(screen.getAllByText('Mensualidad')).toHaveLength(2)
    expect(screen.getByText(c.vencida)).toBeInTheDocument()
  })

  test('sin cuentas abiertas lo dice y no ofrece marcar nada', () => {
    c.vaciarListado()
    render(<c.Dialog />)

    expect(screen.getByText(c.vacio)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: c.seleccionarTodas })).not.toBeInTheDocument()
  })

  test('seleccionar todas reparte por vencimiento hasta agotar el crédito', async () => {
    const user = userEvent.setup()
    render(<c.Dialog />)

    await user.click(screen.getByRole('button', { name: c.seleccionarTodas }))

    // 500.000 de crédito sobre saldos de 300.000 y 400.000: la primera entera,
    // la segunda solo lo que queda.
    expect(montos()[0]).toHaveValue('300.000,00')
    expect(montos()[1]).toHaveValue('200.000,00')
    expect(screen.getByText(/el crédito queda en cero/)).toBeInTheDocument()
  })

  test('marcar una cuenta pone lo que quepa, no su saldo entero', async () => {
    const user = userEvent.setup()
    render(<c.Dialog />)

    // La segunda debe 400.000 y hay 500.000: entra entera.
    await user.click(casillas()[1])
    expect(montos()[1]).toHaveValue('400.000,00')

    // La primera debe 300.000 pero ya solo quedan 100.000 de crédito: ofrecerle
    // su saldo entero sería ofrecer un error.
    await user.click(casillas()[0])
    expect(montos()[0]).toHaveValue('100.000,00')
  })

  test('dice cuánto crédito queda sin aplicar', async () => {
    const user = userEvent.setup()
    render(<c.Dialog />)

    await user.click(casillas()[0])

    expect(screen.getByText(c.cubre)).toBeInTheDocument()
    expect(screen.getByText('$200.000')).toBeInTheDocument()
  })

  test('avisa si no se marcó nada', async () => {
    const user = userEvent.setup()
    render(<c.Dialog />)

    await user.click(screen.getByRole('button', { name: 'Aplicar' }))

    expect(c.avisos().at(-1)).toEqual({ tono: 'error', texto: expect.stringMatching(c.sinAsignar) })
    expect(c.aplicar()).not.toHaveBeenCalled()
  })

  test('avisa si lo asignado supera el crédito', async () => {
    const user = userEvent.setup()
    render(<c.Dialog />)

    await user.type(montos()[0], '600000')
    await user.click(screen.getByRole('button', { name: 'Aplicar' }))

    expect(c.avisos().at(-1)).toEqual({
      tono: 'error',
      texto: 'Lo asignado supera el crédito por $100.000,00',
    })
    expect(c.aplicar()).not.toHaveBeenCalled()
  })

  test('envía el reparto con dos decimales, sin las filas en cero, y cierra', async () => {
    const user = userEvent.setup()
    render(<c.Dialog />)

    await user.type(montos()[0], '150000')
    await user.type(montos()[1], '0')
    await user.click(screen.getByRole('button', { name: 'Aplicar' }))

    await waitFor(() => expect(c.aplicar()).toHaveBeenCalledTimes(1))
    expect(c.aplicar().mock.calls[0][0]).toMatchObject({
      orgId: 'o1',
      id: 'm1',
      data: { allocations: [{ [c.claveItem]: 'a1', amount: '150000.00' }] },
    })
    expect(c.avisos().at(-1)).toEqual({ tono: 'success', texto: 'Anticipo aplicado' })
    expect(c.cerrado()).toBe(true)
  })
}
