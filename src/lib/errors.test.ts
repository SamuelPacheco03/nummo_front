import { expect, test } from 'vitest'
import { ApiError } from '@/api/http-client'
import {
  errorCode,
  featureNotAvailable,
  getErrorMessage,
  isOrganizationSuspended,
  limitExceeded,
} from './errors'

test('429 / RATE_LIMITED → mensaje amable', () => {
  expect(getErrorMessage(new ApiError(429, { code: 'RATE_LIMITED', message: 'too many' }))).toMatch(
    /Demasiados intentos/,
  )
  expect(getErrorMessage(new ApiError(200, { code: 'RATE_LIMITED', message: 'x' }))).toMatch(
    /Demasiados intentos/,
  )
})

test('413 → contenido demasiado grande', () => {
  expect(getErrorMessage(new ApiError(413, { code: 'INTERNAL', message: 'x' }))).toMatch(
    /demasiado grande/,
  )
})

test('otros errores usan el mensaje del backend / fallback', () => {
  expect(getErrorMessage(new ApiError(422, { code: 'VALIDATION', message: 'Email inválido' }))).toBe(
    'Email inválido',
  )
  expect(getErrorMessage(new Error('boom'))).toBe('boom')
  expect(getErrorMessage(null, 'fallback')).toBe('fallback')
})

test('ORGANIZATION_SUSPENDED se reconoce y se cuenta en sus términos', () => {
  const err = new ApiError(403, { code: 'ORGANIZATION_SUSPENDED', message: 'org suspended' })

  expect(isOrganizationSuspended(err)).toBe(true)
  expect(getErrorMessage(err)).toMatch(/solo lectura/)
  expect(isOrganizationSuspended(new ApiError(403, { code: 'FORBIDDEN', message: 'x' }))).toBe(false)
})

test('los details de plan llegan tipados, no adivinados', () => {
  const sinCupo = new ApiError(409, {
    code: 'LIMIT_EXCEEDED',
    message: 'limit',
    details: { limit: 'max_contacts', max: 200, used: 200, plan: 'BASIC' },
  })
  expect(limitExceeded(sinCupo)).toEqual({
    limit: 'max_contacts',
    max: 200,
    used: 200,
    plan: 'BASIC',
  })

  const sinPlan = new ApiError(403, {
    code: 'FEATURE_NOT_AVAILABLE',
    message: 'feature',
    details: { feature: 'ai_byok', plan: 'FREE' },
  })
  expect(featureNotAvailable(sinPlan)).toEqual({ feature: 'ai_byok', plan: 'FREE' })
})

test('un código distinto no se lee como error de plan', () => {
  const conflicto = new ApiError(409, { code: 'CONFLICT', message: 'ya existe' })

  expect(limitExceeded(conflicto)).toBeNull()
  expect(featureNotAvailable(conflicto)).toBeNull()
  expect(errorCode(conflicto)).toBe('CONFLICT')
  expect(errorCode(new Error('boom'))).toBeUndefined()
})

test('un LIMIT_EXCEEDED sin cifras no se inventa un contador', () => {
  // Preferimos el mensaje del backend a pintar «0 de 0», que sería mentira.
  const roto = new ApiError(409, { code: 'LIMIT_EXCEEDED', message: 'sin cupo', details: {} })

  expect(limitExceeded(roto)).toBeNull()
})
