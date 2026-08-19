import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SortingState } from '@tanstack/react-table'
import { DataList } from './data-list'
import { listColumns } from './list-columns'

afterEach(cleanup)

/**
 * **La convención de orden de las tablas** (§18.1), probada donde vive.
 *
 * Estas afirmaciones son las que faltaban el día que pagos y egresos ordenaban
 * por «Monto» pero no por «Fecha»: la columna de la fecha se llama `date` en la
 * interfaz y `receivedAt` / `disbursedAt` en el contrato, y nadie se dio cuenta
 * de que la cabecera había dejado de ordenar.
 */

interface Fila {
  id: string
  proveedor: string
  fecha: string
  monto: string
}

const column = listColumns<Fila>()

const columnas = column.columns([
  column.display({
    id: 'party',
    header: 'Proveedor',
    meta: { card: 'title' },
    cell: ({ row }) => row.original.proveedor,
  }),
  // El caso que importa: el id es de la interfaz, el campo es del contrato.
  column.display({
    id: 'date',
    header: 'Fecha',
    meta: { card: 'meta', sortField: 'disbursedAt' },
    cell: ({ row }) => row.original.fecha,
  }),
  column.display({
    id: 'amount',
    header: 'Monto',
    meta: { align: 'right', card: 'amount' },
    cell: ({ row }) => row.original.monto,
  }),
])

const filas: Fila[] = [{ id: '1', proveedor: 'Ana Torres', fecha: '15 ago 2026', monto: '$350.000' }]

/** Lo que acepta el endpoint: la fecha y el monto, no el proveedor. */
const OPCIONES = [
  { field: 'disbursedAt', label: 'Fecha' },
  { field: 'amount', label: 'Monto' },
]

function pintar(value: SortingState) {
  const onChange = vi.fn()
  render(
    <DataList
      columns={columnas}
      rows={filas}
      getRowId={(r) => r.id}
      sort={{ value, onChange, options: OPCIONES }}
    />,
  )
  return onChange
}

test('ordena por cabecera todo lo que el endpoint acepta, y nada más', () => {
  pintar([{ id: 'disbursedAt', desc: true }])

  expect(screen.getByRole('button', { name: 'Fecha' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Monto' })).toBeInTheDocument()
  // El endpoint no ordena por contraparte: la cabecera no promete lo que no hay.
  expect(screen.queryByRole('button', { name: 'Proveedor' })).not.toBeInTheDocument()
})

test('la columna manda el campo del contrato, no su propio id', async () => {
  const onChange = pintar([{ id: 'disbursedAt', desc: true }])

  await userEvent.click(screen.getByRole('button', { name: 'Fecha' }))

  // `disbursedAt`, nunca `date`: lo que viaja al API es vocabulario del contrato.
  expect(onChange).toHaveBeenCalledWith([{ id: 'disbursedAt', desc: false }])
})

test('cambiar de columna conserva la dirección', async () => {
  const onChange = pintar([{ id: 'disbursedAt', desc: true }])

  await userEvent.click(screen.getByRole('button', { name: 'Monto' }))

  // Venías mirando lo más reciente primero: sigues queriendo lo mayor primero.
  expect(onChange).toHaveBeenCalledWith([{ id: 'amount', desc: true }])
})

test('la columna ordenada se anuncia con aria-sort, y solo ella', () => {
  pintar([{ id: 'disbursedAt', desc: true }])

  expect(screen.getByRole('columnheader', { name: 'Fecha' })).toHaveAttribute(
    'aria-sort',
    'descending',
  )
  expect(screen.getByRole('columnheader', { name: 'Monto' })).not.toHaveAttribute('aria-sort')
})

test('sin orden en el endpoint, ninguna cabecera finge que ordena', () => {
  render(<DataList columns={columnas} rows={filas} getRowId={(r) => r.id} />)

  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})
