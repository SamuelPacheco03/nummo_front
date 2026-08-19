import { expect, test } from 'vitest'
import { ApiError } from '@/api/http-client'
import { planErrorMessage } from './errors'

test('una feature que el plan no incluye se cuenta como «mejora», no como fallo', () => {
  const err = new ApiError(403, {
    code: 'FEATURE_NOT_AVAILABLE',
    message: 'Feature not available',
    details: { feature: 'ai_byok', plan: 'FREE' },
  })

  expect(planErrorMessage(err)).toEqual({
    title: 'Tu plan Free no incluye usar tu propia llave de IA',
    description: 'Está disponible en un plan superior.',
  })
})

test('un aforo lleno ofrece las dos salidas: liberar o mejorar', () => {
  const err = new ApiError(409, {
    code: 'LIMIT_EXCEEDED',
    message: 'Limit exceeded',
    details: { limit: 'max_contacts', max: 200, used: 200, plan: 'BASIC' },
  })

  expect(planErrorMessage(err)).toEqual({
    title: 'Llegaste al tope de contactos',
    description: 'Tienes 200 de 200. Libera espacio o mejora de plan.',
  })
})

test('una cuota mensual dice además que se renueva sola', () => {
  // Archivar contactos no devuelve mensajes de Numi: el tope que se reinicia
  // cada mes tiene una salida que el aforo no tiene, y al revés.
  const err = new ApiError(409, {
    code: 'LIMIT_EXCEEDED',
    message: 'Limit exceeded',
    details: { limit: 'ai_messages_monthly', max: 50, used: 50, period: '2026-08' },
  })

  expect(planErrorMessage(err)?.title).toBe('Se acabaron tus mensajes de Numi de este mes')
  expect(planErrorMessage(err)?.description).toMatch(/se renueva el mes que viene/)
})

test('el tope anti-abuso de organizaciones gratuitas se nombra igual que los demás', () => {
  // No viene de un plan, pero llega por la misma vía y no hay que distinguirlo.
  const err = new ApiError(409, {
    code: 'LIMIT_EXCEEDED',
    message: 'Limit exceeded',
    details: { limit: 'free_organizations', max: 2, used: 2 },
  })

  expect(planErrorMessage(err)?.title).toBe('Llegaste al tope de organizaciones gratuitas')
})

test('cualquier otro error no es un error de plan', () => {
  expect(planErrorMessage(new ApiError(422, { code: 'VALIDATION', message: 'x' }))).toBeNull()
  expect(planErrorMessage(new Error('boom'))).toBeNull()
})
