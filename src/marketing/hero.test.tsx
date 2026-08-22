import { afterEach, expect, test, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { cleanup, render, screen } from '@testing-library/react'
import { Hero } from './hero'
import { rutasApp } from './links'

afterEach(cleanup)

/*
  El hero es lo primero que va a producción de la portada, así que se vigila lo que
  rompería el prerender o la lectura: que el titular exista como `h1` —Google y WhatsApp
  leen eso— y que las llamadas a la acción sigan siendo enlaces navegables.
*/

test('el titular es un h1 y lleva el destacado en serif', () => {
  render(<Hero />)
  const titular = screen.getByRole('heading', { level: 1 })
  expect(titular).toHaveTextContent('Alguien tiene que estar mirando tus números. Que no seas tú.')
  // El destacado va en su propio `em`: es lo que la serif cursiva necesita para existir.
  expect(titular.querySelector('em')).toHaveTextContent('Que no seas tú.')
})

test('las dos llamadas a la acción son enlaces', () => {
  render(<Hero />)
  expect(screen.getByRole('link', { name: /empezar ahora/i })).toHaveAttribute('href', rutasApp.registro)
  expect(screen.getByRole('link', { name: /ver cómo funciona/i })).toBeInTheDocument()
})

/*
  Las dos anotaban en el embudo... o eso parecía. Ninguna emitía nada: los `cta_clicked` de
  `hero` que llegaban eran los del navegador de arriba, que se atribuye a esta sección. El
  embudo contaba las pulsaciones de la barra y ni una del hero.
*/
test('las dos llamadas a la acción se anotan en el embudo', async () => {
  const encolar = vi.fn()
  render(<Hero cola={{ encolar } as never} />)

  await userEvent.click(screen.getByRole('link', { name: /empezar ahora/i }))
  await userEvent.click(screen.getByRole('link', { name: /ver cómo funciona/i }))

  expect(encolar.mock.calls.map(([e]) => e)).toEqual([
    { name: 'cta_clicked', section: 'hero', action: 'signup' },
    { name: 'cta_clicked', section: 'hero', action: 'demo' },
  ])
})

test('las cifras se pintan con el formato de la app, no a mano', () => {
  render(<Hero />)
  // `formatMoney` en es-CO: miles con punto y el símbolo pegado.
  expect(screen.getByText('$24.680.000')).toBeInTheDocument()
  expect(screen.getByText('$8.420.000')).toBeInTheDocument()
})

/*
  La tinta del botón la resuelve `inkOnFill` según el relleno de cada paleta: blanca sobre
  el navy, oscura sobre el durazno de los mockups —donde el blanco daría 1.9:1—. Escribirla
  a mano es el error que la capa existe para evitar, y aquí se vigila.
*/
test('la acción principal confía el color de su tinta al token', () => {
  render(<Hero />)
  const cta = screen.getByRole('link', { name: /empezar ahora/i })
  expect(cta.className).toContain('bg-cta')
  expect(cta.className).toContain('text-cta-foreground')
  expect(cta.className).not.toMatch(/text-white|text-black/)
})

/*
  La prueba social eran tres avatares con iniciales inventadas bajo «Creado para quienes
  hacen que las cosas pasen»: la forma de un «1.200 negocios ya lo usan» sin el respaldo.
  No hay clientes que citar todavía, así que no se insinúan.
*/
test('el hero no insinúa clientes que no existen', () => {
  const { container } = render(<Hero />)
  expect(container.textContent).not.toMatch(/creado para quienes hacen que las cosas pasen/i)
  expect(container.textContent).toContain('Pensado para cómo se mueve la plata en Colombia')
})
