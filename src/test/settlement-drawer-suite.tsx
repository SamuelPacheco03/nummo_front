import { expect, test, type Mock } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import type { ComponentType } from 'react'

/**
 * **La misma suite para registrar un pago y registrar un egreso.**
 *
 * Cobrar es pagar mirado desde el otro lado: el mismo formulario, la misma
 * selección de cuentas, la misma aritmética y los mismos avisos. Se prueban una
 * sola vez y solo cambian las palabras y el nombre del campo que viaja al API.
 *
 * Llega **tarde y a propósito**: el formulario ya estaba compartido y no tenía
 * ninguna prueba, así que nada sujetaba lo que promete —que el monto lo pone la
 * selección y que al API solo viaja lo marcado—. Mira lo que ve quien cobra y lo
 * que sale hacia el contrato, nunca qué componente pinta qué.
 *
 * Los datos son siempre los mismos: tres cuentas abiertas de 300.000, 400.000 y
 * 200.000 —más una saldada que no debe ofrecerse— del mismo contacto, todas del
 * concepto «Mensualidad».
 *
 * Cada cara simula su `ContactPicker` con un botón **«Cambiar contacto»**: el
 * selector real es un popover con búsqueda y lo suyo se prueba aparte; aquí lo
 * que importa es que cambiar de contacto no se lleve por delante el reparto.
 */
export interface SettlementDrawerCase {
  /** La página montada, con su contacto ya puesto por la URL. */
  Page: ComponentType
  /** Encabezado del selector: «¿Qué cuentas cubre?» / «¿Qué gastos cubre?». */
  pregunta: string
  /** «Seleccionar todas» / «Seleccionar todos». */
  seleccionarTodas: string
  /** «Quitar todas» / «Quitar todos». */
  quitarTodas: string
  /** Cómo acaba la frase de lo que sobra: «a favor del pagador». */
  sobrante: RegExp
  /** «Se aplica completo a 2 cuentas» / «… 2 gastos». */
  completo: RegExp
  /** Cómo llama cada cara a una cuenta vencida: «Vencida» / «Vencido». */
  vencida: string
  /** Nombre del campo que identifica la cuenta en el cuerpo del POST. */
  claveItem: string
  /** El `mutateAsync` simulado del endpoint de registrar. */
  registrar: () => Mock
  /** Los avisos que se dispararon, en orden. */
  avisos: () => { tono: string; texto: string }[]
  /** Deja el formulario abierto ya con la segunda cuenta marcada (`?aplicar=`). */
  conCuentaPreseleccionada: () => void
}

/** El campo de monto de cada fila. Van en el orden de la lista. */
function filas(): HTMLInputElement[] {
  return screen.getAllByPlaceholderText('0') as HTMLInputElement[]
}

function casillas(): HTMLInputElement[] {
  return screen.getAllByRole('checkbox') as HTMLInputElement[]
}

function monto(): HTMLInputElement {
  return screen.getByLabelText(/^Monto/) as HTMLInputElement
}

function pintar(Page: ComponentType) {
  render(
    <MemoryRouter initialEntries={['/registrar']}>
      <Page />
    </MemoryRouter>,
  )
}

/** Rellena lo que el contrato exige aparte del dinero, para poder enviar. */
async function completarObligatorios(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText(/Método de pago/), 'pm1')
  await user.selectOptions(screen.getByLabelText(/Cuenta (destino|origen)/), 'fa1')
}

export function runSettlementDrawerSuite(c: SettlementDrawerCase) {
  test('ofrece solo lo que sigue abierto, y dice de qué es y cómo está', () => {
    pintar(c.Page)

    expect(screen.getByText(c.pregunta)).toBeInTheDocument()
    // Tres de las cuatro: la saldada no admite dinero.
    expect(filas()).toHaveLength(3)
    // Cada fila dice de qué es, no solo cuándo vence.
    expect(screen.getAllByText('Mensualidad')).toHaveLength(3)
    // Y cómo está, que es lo que distinguía una fila de otra.
    expect(screen.getAllByText(c.vencida).length).toBeGreaterThan(0)
  })

  test('marcar una cuenta la salda entera y el monto se suma solo', async () => {
    const user = userEvent.setup()
    pintar(c.Page)

    await user.click(casillas()[0])

    expect(filas()[0]).toHaveValue('300.000,00')
    expect(monto()).toHaveValue('300.000,00')

    await user.click(casillas()[1])
    expect(monto()).toHaveValue('700.000,00')
    expect(screen.getByText(c.completo)).toBeInTheDocument()
  })

  test('escribir un importe marca la fila, y borrarlo la desmarca', async () => {
    const user = userEvent.setup()
    pintar(c.Page)

    await user.type(filas()[0], '150000')
    expect(casillas()[0]).toBeChecked()
    expect(monto()).toHaveValue('150.000,00')

    await user.clear(filas()[0])
    expect(casillas()[0]).not.toBeChecked()
    expect(monto()).toHaveValue('')
  })

  test('el botón de todas marca y desmarca sin dejar a medias', async () => {
    const user = userEvent.setup()
    pintar(c.Page)

    await user.click(screen.getByRole('button', { name: c.seleccionarTodas }))
    expect(monto()).toHaveValue('900.000,00')

    await user.click(screen.getByRole('button', { name: c.quitarTodas }))
    expect(monto()).toHaveValue('')
    expect(casillas().some((casilla) => casilla.checked)).toBe(false)
  })

  test('un monto escrito a mano manda, y lo que sobra se explica en palabras', async () => {
    const user = userEvent.setup()
    pintar(c.Page)

    await user.click(casillas()[0])
    await user.clear(monto())
    await user.type(monto(), '500000')

    // 500.000 recibidos sobre 300.000 marcados: sobran 200.000, y se dice a
    // dónde van en vez de dejar una cifra rotulada «sin asignar».
    expect(screen.getByText(c.sobrante)).toBeInTheDocument()

    // Y ya no lo recalcula la selección: marcar otra cuenta no lo mueve.
    await user.click(casillas()[1])
    expect(monto()).toHaveValue('500.000')
    expect(screen.getByText(/Lo repartido supera el monto/)).toBeInTheDocument()
  })

  test('desde el resumen se puede volver al total de lo marcado', async () => {
    const user = userEvent.setup()
    pintar(c.Page)

    await user.click(casillas()[0])
    await user.clear(monto())
    await user.type(monto(), '500000')
    await user.click(screen.getByRole('button', { name: 'Usar $300.000' }))

    expect(monto()).toHaveValue('300.000,00')
    // Y vuelve a seguir a la selección, que es lo que se acaba de pedir.
    await user.click(casillas()[1])
    expect(monto()).toHaveValue('700.000,00')
  })

  test('no deja registrar si lo repartido no cabe en el monto', async () => {
    const user = userEvent.setup()
    pintar(c.Page)

    await completarObligatorios(user)
    await user.click(casillas()[0])
    await user.clear(monto())
    await user.type(monto(), '100000')
    await user.click(screen.getByRole('button', { name: /^Registrar/ }))

    expect(c.avisos().at(-1)?.tono).toBe('error')
    expect(c.avisos().at(-1)?.texto).toMatch(/supera el monto/)
    expect(c.registrar()).not.toHaveBeenCalled()
  })

  test('al API viajan el total y solo las cuentas marcadas, con dos decimales', async () => {
    const user = userEvent.setup()
    pintar(c.Page)

    await completarObligatorios(user)
    await user.click(casillas()[0])
    await user.click(casillas()[2])
    await user.click(screen.getByRole('button', { name: /^Registrar/ }))

    await waitFor(() => expect(c.registrar()).toHaveBeenCalledTimes(1))
    const cuerpo = c.registrar().mock.calls[0][0].data
    expect(cuerpo.amount).toBe('500000.00')
    expect(cuerpo.allocations).toEqual([
      { [c.claveItem]: 'a1', amount: '300000.00' },
      { [c.claveItem]: 'a3', amount: '200000.00' },
    ])
  })

  test('la cuenta desde la que se entró llega ya marcada', async () => {
    c.conCuentaPreseleccionada()
    pintar(c.Page)

    await waitFor(() => expect(casillas()[1]).toBeChecked())
    expect(filas()[1]).toHaveValue('400.000,00')
    expect(monto()).toHaveValue('400.000,00')
    // Y solo esa: entrar por una cuenta no marca las de al lado.
    expect(casillas()[0]).not.toBeChecked()
  })

  test('cambiar de contacto no se lleva el reparto del anterior', async () => {
    const user = userEvent.setup()
    pintar(c.Page)

    await user.click(screen.getByRole('button', { name: c.seleccionarTodas }))
    expect(monto()).toHaveValue('900.000,00')

    // Las cuentas son de quien las debe: las del anterior viajaban invisibles
    // dentro del POST del siguiente.
    await user.click(screen.getByRole('button', { name: 'Cambiar contacto' }))

    await waitFor(() => expect(monto()).toHaveValue(''))
    expect(casillas().some((casilla) => casilla.checked)).toBe(false)
  })
}
