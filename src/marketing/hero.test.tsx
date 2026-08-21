import { afterEach, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Hero } from './hero'

afterEach(cleanup)

/*
  El hero es lo primero que va a producción de la portada, así que se vigila lo que
  rompería el prerender o la lectura: que el titular exista como `h1` —Google y WhatsApp
  leen eso— y que las llamadas a la acción sigan siendo enlaces navegables.
*/

test('el titular es un h1 y lleva el destacado en serif', () => {
  render(<Hero />)
  const titular = screen.getByRole('heading', { level: 1 })
  expect(titular).toHaveTextContent('Tus finanzas, por fin en orden.')
  // El destacado va en su propio `em`: es lo que la serif cursiva necesita para existir.
  expect(titular.querySelector('em')).toHaveTextContent('por fin')
})

test('las dos llamadas a la acción son enlaces', () => {
  render(<Hero />)
  expect(screen.getByRole('link', { name: /empezar ahora/i })).toHaveAttribute('href', '/register')
  expect(screen.getByRole('link', { name: /ver cómo funciona/i })).toBeInTheDocument()
})

test('las cifras se pintan con el formato de la app, no a mano', () => {
  render(<Hero />)
  // `formatMoney` en es-CO: miles con punto y el símbolo pegado.
  expect(screen.getByText('$24.680.000')).toBeInTheDocument()
  expect(screen.getByText('$8.420.000')).toBeInTheDocument()
})

/*
  El durazno de la acción solo sostiene tinta oscura. La clase tiene que seguir siendo el
  token —que `inkOnFill` resuelve— y no un `text-white` escrito a mano, que daría 1.9:1.
*/
test('la acción principal confía el color de su tinta al token', () => {
  render(<Hero />)
  const cta = screen.getByRole('link', { name: /empezar ahora/i })
  expect(cta.className).toContain('text-primary-foreground')
  expect(cta.className).not.toMatch(/text-white|text-black/)
})
