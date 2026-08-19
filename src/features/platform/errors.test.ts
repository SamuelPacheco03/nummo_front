import { afterEach, expect, test, vi } from 'vitest'
import { ApiError } from '@/api/http-client'
import { setAppNavigate } from '@/lib/navigate'

/** Lo que un aviso lleva encima del título, que es lo que aquí se comprueba. */
interface ToastOptions {
  description?: string
  action?: { label: string; onClick: () => void }
}

/** El aviso se sustituye entero: lo que se prueba es qué se pide pintar. */
const toastSpy = vi.hoisted(() => ({
  error: (_titulo: string, _opciones?: unknown) => {},
}))
vi.mock('sonner', () => ({ toast: { error: (t: string, o?: unknown) => toastSpy.error(t, o) } }))

const { planErrorMessage, toastApiError } = await import('./errors')

afterEach(() => {
  setAppNavigate(null)
})

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
  expect(planErrorMessage(err)?.description).toMatch(/Se renueva el mes que viene/)
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

test('un error de plan sale con la salida a un clic, no solo con el diagnóstico', () => {
  const avisos: { titulo: string; opciones?: ToastOptions }[] = []
  const destinos: string[] = []
  toastSpy.error = (titulo, opciones) => avisos.push({ titulo, opciones: opciones as ToastOptions })
  setAppNavigate((to) => destinos.push(to))

  toastApiError(
    new ApiError(409, {
      code: 'LIMIT_EXCEEDED',
      message: 'Limit exceeded',
      details: { limit: 'max_contacts', max: 200, used: 200 },
    }),
  )

  expect(avisos.at(-1)?.opciones?.action?.label).toBe('Ver planes')
  avisos.at(-1)?.opciones?.action?.onClick()
  expect(destinos).toEqual(['/config/plan'])
})

test('un error corriente no ofrece planes: no tiene nada que ver', () => {
  const avisos: { titulo: string; opciones?: unknown }[] = []
  toastSpy.error = (titulo, opciones) => avisos.push({ titulo, opciones })

  toastApiError(new ApiError(422, { code: 'VALIDATION', message: 'Email inválido' }))

  expect(avisos.at(-1)?.titulo).toBe('Email inválido')
  expect(avisos.at(-1)?.opciones).toBeUndefined()
})
