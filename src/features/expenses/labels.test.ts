import { expect, test } from 'vitest'
import { disbursementStatus } from './labels'
import { isVoidedSettlement } from '@/lib/settlement-list'

test('los cuatro estados de un egreso dicen cosas distintas', () => {
  // Esperar pide una acción de alguien; rechazado es dinero que no salió y ya no
  // saldrá; reversado ocurrió y se deshizo. Con un solo tono, «espera firma» y
  // «se pagó» se leerían igual (§7).
  expect(disbursementStatus('PENDING_APPROVAL')).toEqual({
    tone: 'warning',
    label: 'Espera aprobación',
  })
  expect(disbursementStatus('POSTED')).toEqual({ tone: 'success', label: 'Registrado' })
  expect(disbursementStatus('REJECTED')).toEqual({ tone: 'destructive', label: 'Rechazado' })
  expect(disbursementStatus('REVERSED')).toEqual({ tone: 'muted', label: 'Reversado' })
})

test('un estado que el contrato añada no se pinta como si fuera normal', () => {
  expect(disbursementStatus('FUTURO')).toEqual({ tone: 'muted', label: 'FUTURO' })
})

test('solo va tachado lo que no movió dinero y ya no lo moverá', () => {
  expect(isVoidedSettlement('REVERSED')).toBe(true)
  expect(isVoidedSettlement('REJECTED')).toBe(true)
  // Un pendiente todavía puede salir: tacharlo lo leería como cancelado.
  expect(isVoidedSettlement('PENDING_APPROVAL')).toBe(false)
  expect(isVoidedSettlement('POSTED')).toBe(false)
})
