import { afterEach, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Hero } from './hero'

afterEach(cleanup)

/*
  El hero es lo único de la portada que ya va a producción, así que se vigila lo que
  rompería el prerender o la lectura: que el titular exista como `h1` —Google y WhatsApp
  leen eso— y que las dos llamadas a la acción sigan siendo enlaces navegables.
*/

test('el titular es un h1 y lleva el destacado en serif', () => {
  render(<Hero />)
  const titular = screen.getByRole('heading', { level: 1 })
  expect(titular).toHaveTextContent('Deja de perseguir lo que te deben.')
  // El destacado va en su propio `em`: es lo que la serif cursiva necesita para existir.
  expect(titular.querySelector('em')).toHaveTextContent('lo que te deben')
})

test('las dos llamadas a la acción son enlaces', () => {
  render(<Hero />)
  expect(screen.getByRole('link', { name: /crear cuenta gratis/i })).toHaveAttribute(
    'href',
    '/register',
  )
  expect(screen.getByRole('link', { name: /ver una demo/i })).toBeInTheDocument()
})

test('las cifras se pintan con el formato de la app, no a mano', () => {
  render(<Hero />)
  // `formatMoney` en es-CO: miles con punto y el símbolo pegado.
  expect(screen.getByText('$4.620.000')).toBeInTheDocument()
  expect(screen.getAllByText('$1.450.000').length).toBeGreaterThan(0)
})
