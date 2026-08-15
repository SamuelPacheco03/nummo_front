import { expect, test } from 'vitest'
import { ApiError } from '@/api/http-client'
import { getErrorMessage } from './errors'

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
