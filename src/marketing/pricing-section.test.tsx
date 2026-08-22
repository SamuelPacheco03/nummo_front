import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { PricingPlan } from '@/api/generated/model'

const getPricing = vi.fn()
vi.mock('@/api/generated/endpoints/public/public', () => ({
  getApiV1PublicPricing: () => getPricing(),
}))

const { PricingSection } = await import('./pricing-section')

/* Con llaves: un hook que DEVUELVE algo, Vitest lo espera — y un mock no es una promesa. */
beforeEach(() => {
  getPricing.mockReset()
})
afterEach(() => {
  cleanup()
})

const responde = (plans: PricingPlan[]) =>
  getPricing.mockResolvedValue({ status: 200, data: { plans } })

const plan = (p: Partial<PricingPlan> & Pick<PricingPlan, 'code' | 'name'>): PricingPlan => ({
  description: null,
  price: null,
  features: [],
  limits: [],
  ...p,
})

/*
  La trampa que el handoff pone en negrita, y la única que no se ve sin backend: hoy solo
  FREE tiene precio publicado. Básico y Pro llegan en `null`, y eso NO es gratis ni es un
  error — es «consultar».
*/
test('un plan sin tarifa dice «a consultar», no cero ni gratis', async () => {
  responde([
    plan({ code: 'FREE', name: 'Free', price: { amount: '0.00', currency: 'COP' } }),
    plan({ code: 'PRO', name: 'Pro' }),
  ])
  render(<PricingSection cola={null} />)

  expect(await screen.findByText('Gratis')).toBeInTheDocument()
  /*
    Lo que se vigila es la REGLA, no el copy: un plan sin tarifa no puede leerse como
    gratis ni como cero. La forma de decirlo cambió con el rediseño; el fondo no.
  */
  expect(screen.getByText('Precio personalizado')).toBeInTheDocument()
  expect(screen.getByText(/se ajusta a tu operación/i)).toBeInTheDocument()
  expect(screen.queryByText('$0')).not.toBeInTheDocument()
  expect(screen.queryByText(/^gratis$/i)).toBeInTheDocument()
})

/* WhatsApp en el plan gratis viene a cero A PROPÓSITO: es un tope, no la ausencia de uno. */
test('un tope en cero se muestra como cero, no como ilimitado', async () => {
  responde([
    plan({
      code: 'FREE',
      name: 'Free',
      price: { amount: '0.00', currency: 'COP' },
      limits: [
        { key: 'wa', label: 'Mensajes de WhatsApp', value: 0, unit: 'al mes' },
        { key: 'c', label: 'Contactos', value: null, unit: null },
      ],
    }),
  ])
  render(<PricingSection cola={null} />)

  expect(await screen.findByText('0 al mes')).toBeInTheDocument()
  expect(screen.getByText('Sin límite')).toBeInTheDocument()
})

/*
  Una fila ausente no dice «no lo tiene», dice «no se sabe». Pintarla como un «no» sería
  afirmar algo que el backend no dijo.
*/
test('una función que el backend no anuncia para un plan no se pinta como excluida', async () => {
  responde([
    plan({
      code: 'FREE',
      name: 'Free',
      price: { amount: '0.00', currency: 'COP' },
      features: [{ key: 'wa', label: 'Cobros por WhatsApp', detail: null, included: false }],
    }),
    plan({
      code: 'PRO',
      name: 'Pro',
      features: [
        { key: 'wa', label: 'Cobros por WhatsApp', detail: null, included: true },
        { key: 'api', label: 'Acceso por API', detail: null, included: true },
      ],
    }),
  ])
  render(<PricingSection cola={null} />)

  // «Cobros por WhatsApp» sale en los dos planes; «Acceso por API» solo en el que la anuncia.
  expect(await screen.findAllByText('Cobros por WhatsApp')).toHaveLength(2)
  expect(screen.getAllByText('Acceso por API')).toHaveLength(1)
})

test('si el backend no responde, ofrece reintentar en vez de quedarse en blanco', async () => {
  /*
    Se simula con un 503 y no rechazando la promesa del mock: `vi.fn` guarda lo que
    devuelve en `mock.results`, y una promesa rechazada ahí queda sin manejador y Vitest
    la cuenta como error del run. Un status que no es 200 recorre exactamente el mismo
    camino —`cargarPrecios` lanza— y de paso prueba esa línea.
  */
  getPricing.mockResolvedValue({ status: 503, data: {} })
  render(<PricingSection cola={null} />)

  expect(await screen.findByRole('button', { name: /reintentar/i })).toBeInTheDocument()
})

test('sin planes publicados dice qué hacer, no muestra una rejilla vacía', async () => {
  responde([])
  render(<PricingSection cola={null} />)

  expect(await screen.findByText(/estamos afinando los planes/i)).toBeInTheDocument()
})
