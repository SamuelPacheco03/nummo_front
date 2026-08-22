import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { NumiSection } from './numi-section'
import { rutasApp } from './links'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

/**
 * Con `prefers-reduced-motion` el hilo aparece entero de golpe. Se prueba en ese modo a
 * propósito: la conversación es **contenido**, no adorno, y quien pide menos movimiento no
 * puede quedarse sin leerla — que es justo el fallo que un hilo escrito a plazos invita.
 */
function conMovimientoReducido() {
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  )
}

test('sin movimiento, la conversación se lee entera', () => {
  conMovimientoReducido()
  render(<NumiSection cola={null} />)

  expect(screen.getByText(/revisé tus movimientos de esta semana/i)).toBeInTheDocument()
  expect(screen.getByText(/¿qué debería priorizar\?/i)).toBeInTheDocument()
  expect(screen.getByText(/cobro vencido de grupo norte/i)).toBeInTheDocument()
  // Y ya no queda nadie escribiendo.
  expect(screen.queryByText(/está escribiendo/i)).not.toBeInTheDocument()
})

test('explica qué hace Numi, que es a lo que vino la sección', () => {
  conMovimientoReducido()
  render(<NumiSection cola={null} />)

  expect(screen.getByText('Mira por ti')).toBeInTheDocument()
  expect(screen.getByText('Prioriza')).toBeInTheDocument()
  expect(screen.getByText('Actúa contigo')).toBeInTheDocument()
})

test('la acción lleva a crear cuenta, que es donde se prueba Numi de verdad', () => {
  conMovimientoReducido()
  render(<NumiSection cola={null} />)

  expect(screen.getByRole('link', { name: /probar numi con tu cuenta/i })).toHaveAttribute(
    'href',
    rutasApp.registro,
  )
})

/*
  El guard de la decisión de producto: **la portada no habla con Numi**. Probarlo de verdad
  es crearse una cuenta, y un chat de preventa con cuota añade estados que diseñar —agotado,
  apagado, sin conexión— para ahorrar un paso de treinta segundos.

  Se comprueba sobre el archivo y no montando el componente porque lo que hay que impedir es
  que alguien vuelva a **escribir** la llamada, no solo que se dispare en un render concreto.
  El endpoint sigue existiendo en el backend; el front simplemente no lo usa.
*/
test('la portada no llama al Numi público', () => {
  const fuente = readFileSync('src/marketing/numi-section.tsx', 'utf8')
  /*
    Se mira lo que IMPORTA, no la palabra suelta: el comentario del archivo menciona
    `/public/numi` a propósito, para explicar por qué no se usa.
  */
  expect(fuente).not.toContain('postApiV1PublicNumi')
  expect(fuente).not.toMatch(/from '@\/api\/generated/)
})
