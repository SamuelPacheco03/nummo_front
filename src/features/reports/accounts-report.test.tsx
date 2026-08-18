import { afterEach, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { AccountReport } from '@/api/generated/model'
import { AccountRows } from './accounts-report'

afterEach(cleanup)

const account = (over: Partial<AccountReport> = {}): AccountReport => ({
  accountId: 'acc-1',
  name: 'Caja',
  accountType: 'CASH',
  currency: 'COP',
  isActive: true,
  balance: '70000.00',
  inflow: '100000.00',
  outflow: '30000.00',
  movements: 2,
  ...over,
})

test('enseña el saldo y, aparte, lo que entró y lo que salió', () => {
  render(<AccountRows accounts={[account()]} />)

  expect(screen.getByText('Caja')).toBeInTheDocument()
  // El saldo es de siempre; el movimiento, del período. Van en sitios distintos
  // porque responden preguntas distintas.
  expect(screen.getByText(/\$\s?70[.,]000/)).toBeInTheDocument()
  expect(screen.getByText(/\+\s*\$\s?100[.,]000/)).toBeInTheDocument()
  expect(screen.getByText(/−\s*\$\s?30[.,]000/)).toBeInTheDocument()
})

test('una cuenta quieta lo dice, en vez de enseñar dos ceros', () => {
  render(<AccountRows accounts={[account({ inflow: '0.00', outflow: '0.00', movements: 0 })]} />)

  expect(screen.getByText(/sin movimientos en el período/i)).toBeInTheDocument()
  expect(screen.queryByText(/^\+/)).not.toBeInTheDocument()
})

test('marca la cuenta archivada en lugar de esconderla', () => {
  // Esconderla ocultaría dinero: si tiene saldo, tiene que verse.
  render(<AccountRows accounts={[account({ isActive: false })]} />)
  expect(screen.getByText(/archivada/i)).toBeInTheDocument()
})

test('sin cuentas invita a crear la primera', () => {
  render(<AccountRows accounts={[]} />)
  expect(screen.getByText(/todavía no hay cuentas/i)).toBeInTheDocument()
})
