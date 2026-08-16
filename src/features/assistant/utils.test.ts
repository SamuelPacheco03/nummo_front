import { expect, test } from 'vitest'
import { isConfirmation, mentionsAppliedChange, shouldRefreshData } from './utils'

test('reconoce las confirmaciones del flujo de dos pasos', () => {
  for (const text of ['sí', 'Sí, confírmalo', 'dale', 'OK', 'de una', 'Perfecto, hazlo', 'Adelante']) {
    expect(isConfirmation(text), text).toBe(true)
  }
})

test('no confunde una pregunta larga con una confirmación', () => {
  expect(isConfirmation('ok pero antes explícame cómo calculas la mora de este mes')).toBe(false)
  expect(isConfirmation('¿Cuánto me deben?')).toBe(false)
  expect(isConfirmation('   ')).toBe(false)
})

test('detecta respuestas que anuncian algo ya aplicado', () => {
  expect(mentionsAppliedChange('Listo: registré el abono de $50.000 en Caja.')).toBe(true)
  expect(mentionsAppliedChange('Creé el contacto Ana Pérez.')).toBe(true)
  expect(mentionsAppliedChange('Tienes 3 cuentas por cobrar vencidas.')).toBe(false)
})

test('refresca tras confirmar o tras una escritura anunciada', () => {
  expect(shouldRefreshData('sí', 'Hecho.')).toBe(true)
  expect(shouldRefreshData('registra un pago', 'Confirmo: ¿abono de $50.000 a Ana?')).toBe(false)
  expect(shouldRefreshData('¿algo más?', 'Transferí $100.000 de Caja a Banco.')).toBe(true)
})
