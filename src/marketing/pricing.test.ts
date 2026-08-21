import { expect, test } from 'vitest'
import type { PricingPlan } from '@/api/generated/model'
import { clavesDeFunciones, incluye, leerPrecio, leerTope, ordenarPlanes } from './pricing'

const plan = (p: Partial<PricingPlan> & Pick<PricingPlan, 'code'>): PricingPlan => ({
  name: String(p.code),
  description: null,
  price: null,
  features: [],
  limits: [],
  ...p,
})

/*
  La trampa que el handoff marca en negrita: `price: null` NO es gratis, es «consultar».
  El plan gratuito trae "0.00", que es un precio de verdad.
*/
test('un precio sin publicar se lee «a consultar», no cero', () => {
  expect(leerPrecio(null)).toEqual({ texto: 'A consultar', consultar: true })
  expect(leerPrecio({ amount: '0.00', currency: 'COP' })).toEqual({
    texto: 'Gratis',
    consultar: false,
  })
  expect(leerPrecio({ amount: '49000.00', currency: 'COP' }).texto).toBe('$49.000')
})

/* La otra: `null` es ilimitado y `0` es un tope real. WhatsApp en el gratis viene a cero. */
test('un tope en cero es un tope, no la ausencia de tope', () => {
  expect(leerTope({ key: 'wa', label: 'WhatsApp', value: 0, unit: 'mensajes' })).toBe('0 mensajes')
  expect(leerTope({ key: 'wa', label: 'WhatsApp', value: null, unit: 'mensajes' })).toBe('Sin límite')
  expect(leerTope({ key: 'c', label: 'Contactos', value: 1500, unit: null })).toBe('1.500')
})

test('los planes sin tarifa van al final, no entre medias', () => {
  const planes = [
    plan({ code: 'PRO' }),
    plan({ code: 'FREE', price: { amount: '0.00', currency: 'COP' } }),
    plan({ code: 'BASIC', price: { amount: '49000.00', currency: 'COP' } }),
  ]
  expect(ordenarPlanes(planes).map((p) => p.code)).toEqual(['FREE', 'BASIC', 'PRO'])
})

/*
  Las features llegan sin filtrar y con `included`. La matriz se arma con la UNIÓN de las
  claves: una fila ausente no dice «no lo tiene», dice «no se sabe», y son cosas distintas.
*/
test('la matriz se arma con todas las claves, no con las del primer plan', () => {
  const planes = [
    plan({ code: 'FREE', features: [{ key: 'wa', label: 'Cobros por WhatsApp', detail: null, included: false }] }),
    plan({
      code: 'PRO',
      features: [
        { key: 'wa', label: 'Cobros por WhatsApp', detail: null, included: true },
        { key: 'api', label: 'API', detail: null, included: true },
      ],
    }),
  ]
  expect(clavesDeFunciones(planes)).toEqual(['wa', 'api'])

  expect(incluye(planes[0], 'wa')).toBe(false)
  expect(incluye(planes[1], 'api')).toBe(true)
  // No anunciada para ese plan: ni sí ni no.
  expect(incluye(planes[0], 'api')).toBeUndefined()
})
