import { expect, test } from 'vitest'
import { isOpenAccount } from './settlement'

test('las cuentas en curso admiten dinero', () => {
  for (const displayStatus of ['PENDING', 'PARTIAL', 'OVERDUE']) {
    expect(isOpenAccount({ displayStatus, balance: '1000.00' })).toBe(true)
  }
})

test('las cerradas no, aunque el saldo diga otra cosa', () => {
  for (const displayStatus of ['PAID', 'CANCELLED', 'WRITTEN_OFF']) {
    expect(isOpenAccount({ displayStatus, balance: '1000.00' })).toBe(false)
  }
})

test('una cuenta sin saldo no admite dinero aunque siga abierta', () => {
  // El backend deja la cuenta en PARTIAL hasta que la cierra; ofrecerla para
  // aplicarle un pago sería ofrecer un sitio donde el dinero no cabe.
  expect(isOpenAccount({ displayStatus: 'PARTIAL', balance: '0.00' })).toBe(false)
})

test('un estado desconocido se trata como cerrado, no como abierto', () => {
  // §70: ante un dato que no reconocemos, no se inventa que se puede cobrar.
  expect(isOpenAccount({ displayStatus: 'ALGO_NUEVO', balance: '500.00' })).toBe(false)
})
