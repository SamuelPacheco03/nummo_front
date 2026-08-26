import { expect, test } from 'vitest'
import {
  allocationEntries,
  applyId,
  fillAll,
  isOpenAccount,
  returnPath,
  spreadAmount,
  sumAllocations,
  withApply,
  withReturn,
} from './settlement'

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

test('lo asignado suma solo lo que es un número', () => {
  // Los importes llegan como se teclean: una fila vacía o a medio escribir no
  // puede envenenar el total con un NaN.
  expect(sumAllocations({ a: '1000', b: '500.50', c: '', d: '.' })).toBe(1500.5)
  expect(sumAllocations({})).toBe(0)
})

test('seleccionar todas pone cada cuenta por su saldo entero', () => {
  expect(fillAll([{ id: 'a', balance: '300000' }, { id: 'b', balance: '400000.5' }])).toEqual({
    a: '300000.00',
    b: '400000.50',
  })
})

test('repartir un monto salda de la primera a la última y se detiene al agotarse', () => {
  const cuentas = [
    { id: 'a', balance: '300000' },
    { id: 'b', balance: '400000' },
    { id: 'c', balance: '200000' },
  ]
  // La primera entera, la segunda a medias, la tercera ni aparece.
  expect(spreadAmount(cuentas, 500000)).toEqual({ a: '300000.00', b: '200000.00' })
})

test('repartir más de lo que se debe no inventa saldo donde no cabe', () => {
  const cuentas = [{ id: 'a', balance: '300000' }]
  expect(spreadAmount(cuentas, 900000)).toEqual({ a: '300000.00' })
})

test('repartir cero no toca ninguna cuenta', () => {
  expect(spreadAmount([{ id: 'a', balance: '300000' }], 0)).toEqual({})
})

test('al cuerpo del POST solo viajan las filas con dinero, con dos decimales', () => {
  expect(allocationEntries({ a: '1000', b: '0', c: '', d: '250.5' })).toEqual([
    { id: 'a', amount: '1000.00' },
    { id: 'd', amount: '250.50' },
  ])
})

test('el «vuelve aquí» y el «esta ya viene marcada» se apilan en la misma URL', () => {
  const url = withApply(withReturn('/cartera/pagos/nuevo?payer=c1', '/cartera/cxc/r1'), 'r1')
  const params = new URLSearchParams(url.slice(url.indexOf('?')))

  expect(params.get('payer')).toBe('c1')
  expect(returnPath(params)).toBe('/cartera/cxc/r1')
  expect(applyId(params)).toBe('r1')
})

test('sin el param, no hay cuenta que marcar', () => {
  expect(applyId(new URLSearchParams(''))).toBe(null)
  expect(applyId(new URLSearchParams('aplicar='))).toBe(null)
})
