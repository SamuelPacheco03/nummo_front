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
 * diálogo ya compartido. Por eso mira lo que ve quien reparte —los saldos, el
 * total asignado, los avisos— y lo que sale hacia el API, nunca qué componente
 * pinta qué.
 */
export interface ApplyAdvanceCase {
  /** El diálogo montado y abierto, con sus props puestas. */
  Dialog: ComponentType
  /** Aviso cuando no se asignó nada: «Asigna al menos una cuenta» / «un gasto». */
  sinAsignar: RegExp
  /** Aviso cuando la contraparte no tiene nada abierto. */
  vacio: RegExp
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

export function runApplyAdvanceSuite(c: ApplyAdvanceCase) {
  test('muestra el crédito disponible y solo las cuentas abiertas con saldo', () => {
    render(<c.Dialog />)

    expect(screen.getByText(/Crédito disponible/)).toBeInTheDocument()
    // Dos abiertas de las cuatro del listado: ni la pagada ni la de saldo cero
    // se reparten.
    expect(montos()).toHaveLength(2)
    expect(screen.getByText(/Saldo \$300\.000,00/)).toBeInTheDocument()
    expect(screen.getByText(/Saldo \$400\.000,00/)).toBeInTheDocument()
  })

  test('sin cuentas abiertas lo dice y no ofrece el reparto automático', () => {
    c.vaciarListado()
    render(<c.Dialog />)

    expect(screen.getByText(c.vacio)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Automático' })).toBeDisabled()
  })

  test('el automático reparte por orden hasta agotar el crédito', async () => {
    const user = userEvent.setup()
    render(<c.Dialog />)

    await user.click(screen.getByRole('button', { name: 'Automático' }))

    // 500.000 de crédito sobre saldos de 300.000 y 400.000: la primera entera,
    // la segunda solo lo que queda.
    expect(montos()[0]).toHaveValue('300.000,00')
    expect(montos()[1]).toHaveValue('200.000,00')
    // El disponible y lo asignado coinciden: el crédito quedó repartido entero.
    expect(screen.getAllByText('$500.000,00')).toHaveLength(2)
  })

  test('avisa si no se asignó nada', async () => {
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
      texto: 'Lo asignado supera el crédito disponible',
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
