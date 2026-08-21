import { expect, test } from 'vitest'
import { joinList, parseList } from './expectations'

test('una lista se escribe por líneas o por comas', () => {
  expect(parseList('list_receivables\nlist_payments')).toEqual([
    'list_receivables',
    'list_payments',
  ])
  // Nadie escribe dos elementos en dos renglones: aceptar la coma evita guardar una
  // expectativa llamada «list_receivables, list_payments», que no coincide con nada.
  expect(parseList('list_receivables, list_payments')).toEqual([
    'list_receivables',
    'list_payments',
  ])
})

test('los renglones vacíos y los espacios no cuentan', () => {
  expect(parseList('  uno  \n\n , , dos ')).toEqual(['uno', 'dos'])
  expect(parseList('')).toEqual([])
  expect(parseList('   ')).toEqual([])
})

test('la vuelta al formulario es una por línea', () => {
  expect(joinList(['uno', 'dos'])).toBe('uno\ndos')
  expect(joinList(undefined)).toBe('')
})
