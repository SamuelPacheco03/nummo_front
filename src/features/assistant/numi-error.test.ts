import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/http-client'
import { classifyNumiError, isRetryable } from './numi-error'

const apiError = (status: number, code: string, message: string, details?: unknown) =>
  new ApiError(status, { code, message, ...(details ? { details } : {}) })

const FALLBACK = 'No se pudo contactar a Numi.'

describe('classifyNumiError', () => {
  it('lee el tope agotado y lo cuenta en cristiano', () => {
    const error = classifyNumiError(
      apiError(409, 'LIMIT_EXCEEDED', 'Plan limit reached', {
        limit: 'ai_messages_monthly',
        max: 2000,
        used: 2000,
        plan: 'PRO',
        period: '2026-08',
      }),
      FALLBACK,
    )

    expect(error.kind).toBe('quota')
    expect(error.message).toBe('Llevas 2000 de 2000 mensajes con Numi este mes.')
    expect(error.quota).toEqual({
      limit: 'ai_messages_monthly',
      max: 2000,
      used: 2000,
      period: '2026-08',
    })
  })

  it('sin periodo no promete «este mes»: hay topes que no se reinician', () => {
    const error = classifyNumiError(
      apiError(409, 'LIMIT_EXCEEDED', 'Plan limit reached', {
        limit: 'voice_minutes_monthly',
        max: 120,
        used: 120,
      }),
      FALLBACK,
    )

    expect(error.message).toBe('Llevas 120 de 120 minutos de nota de voz.')
    expect(error.quota?.period).toBeUndefined()
  })

  it('un tope que el front no conoce no enseña su clave cruda', () => {
    // Añadir un límite en el backend no debe filtrar `max_widgets_monthly` a la cara
    // del usuario. Se dice lo que se sabe, que es que se acabó algo del plan.
    const error = classifyNumiError(
      apiError(409, 'LIMIT_EXCEEDED', 'Plan limit reached', {
        limit: 'max_widgets_monthly',
        max: 5,
        used: 5,
      }),
      FALLBACK,
    )

    expect(error.kind).toBe('quota')
    expect(error.message).toBe('Se agotó una de las cuotas de tu plan.')
    expect(error.message).not.toContain('max_widgets_monthly')
  })

  it('si el details no trae lo que promete, se usa el mensaje del backend', () => {
    // Nunca inventar cifras: un «llevas undefined de undefined» es peor que el
    // original, que ya venía en un idioma que se entiende.
    const error = classifyNumiError(
      apiError(409, 'LIMIT_EXCEEDED', 'Se acabó tu cuota.', { limit: 'ai_messages_monthly' }),
      FALLBACK,
    )

    expect(error.message).toBe('Se acabó tu cuota.')
    expect(error.quota).toBeUndefined()
  })

  it('distingue lo que el plan no incluye de lo que se acabó', () => {
    const error = classifyNumiError(
      apiError(403, 'FEATURE_NOT_AVAILABLE', 'Your plan does not include this feature.'),
      FALLBACK,
    )
    expect(error.kind).toBe('plan')
    expect(error.message).toBe('Tu plan no incluye esta función.')
  })

  it('el 422 del chat es «configúrame», no «reinténtalo»', () => {
    const error = classifyNumiError(
      apiError(422, 'VALIDATION', 'El asistente no está configurado.'),
      FALLBACK,
    )
    expect(error.kind).toBe('setup')
    expect(error.message).toBe('El asistente no está configurado.')
  })

  it('lo que no reconoce cae en genérico, con el texto que haya', () => {
    expect(classifyNumiError(new TypeError('Failed to fetch'), FALLBACK)).toMatchObject({
      kind: 'generic',
    })
    expect(classifyNumiError(undefined, FALLBACK)).toEqual({ kind: 'generic', message: FALLBACK })
  })
})

describe('isRetryable', () => {
  it('solo se reintenta lo que pudo cambiar solo', () => {
    // Reintentar sin proveedor, sin cuota o sin plan falla exactamente igual. Un botón
    // que no puede funcionar es peor que ninguno.
    expect(isRetryable({ kind: 'generic', message: '' })).toBe(true)
    expect(isRetryable({ kind: 'quota', message: '' })).toBe(false)
    expect(isRetryable({ kind: 'plan', message: '' })).toBe(false)
    expect(isRetryable({ kind: 'setup', message: '' })).toBe(false)
  })
})
