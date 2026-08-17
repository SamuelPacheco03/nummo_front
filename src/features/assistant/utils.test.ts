import { expect, test } from 'vitest'
import {
  isAwaitingConfirmation,
  isConfirmation,
  mentionsAppliedChange,
  shouldRefreshData,
} from './utils'

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

test('reconoce que Numi propone una operación y espera confirmación', () => {
  const summary = [
    'Registrar pago',
    'Contacto: Laura Gómez',
    'Monto: $350.000',
    'Cuenta destino: Bancolombia',
    '¿Lo registro?',
  ].join('\n')

  expect(isAwaitingConfirmation(summary)).toBe(true)
  expect(isAwaitingConfirmation('Voy a crear el contacto Ana Pérez. ¿Confirmas?')).toBe(true)
  expect(isAwaitingConfirmation('¿Quieres que registre el egreso de $80.000?')).toBe(true)
  expect(isAwaitingConfirmation('Transferencia de Caja a Bancolombia. ¿Procedo?')).toBe(true)
})

test('una pregunta cualquiera no es una propuesta de operación', () => {
  expect(isAwaitingConfirmation('¿Quieres ver el detalle de la cartera?')).toBe(false)
  expect(isAwaitingConfirmation('¿Sobre qué mes quieres el informe?')).toBe(false)
  expect(isAwaitingConfirmation('Laura Gómez te debe $350.000 en 2 cuentas.')).toBe(false)
  expect(isAwaitingConfirmation('')).toBe(false)
})

test('sin signo de interrogación no hay propuesta pendiente', () => {
  // Ya aplicado: habla en pasado y no pregunta nada.
  expect(isAwaitingConfirmation('Registré el pago de $350.000 de Laura Gómez.')).toBe(false)
})
