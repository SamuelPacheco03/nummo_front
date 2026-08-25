import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Switch } from './switch'

afterEach(cleanup)

test('se anuncia como interruptor, no como casilla', async () => {
  /*
    `role="switch"` es lo que hace que un lector de pantalla diga «activado» en
    vez de «casilla marcada». La diferencia importa donde lo que se enciende hace
    algo por su cuenta: la cobranza le escribe a tus clientes.
  */
  const cambiar = vi.fn()
  render(<Switch checked={false} onCheckedChange={cambiar} aria-label="Cobranza automática" />)

  const control = screen.getByRole('switch', { name: 'Cobranza automática' })
  expect(control).not.toBeChecked()

  await userEvent.click(control)
  expect(cambiar).toHaveBeenCalledWith(true)
})

test('responde al teclado, porque sigue siendo un control nativo', async () => {
  // Se apoya en un `<input type="checkbox">` de verdad en vez de reimplementar a
  // mano lo que el navegador ya sabe hacer.
  const cambiar = vi.fn()
  render(<Switch checked={false} onCheckedChange={cambiar} aria-label="Encender" />)

  await userEvent.tab()
  expect(screen.getByRole('switch')).toHaveFocus()
  await userEvent.keyboard(' ')
  expect(cambiar).toHaveBeenCalledWith(true)
})

test('deshabilitado no cambia nada', async () => {
  const cambiar = vi.fn()
  render(<Switch checked onCheckedChange={cambiar} disabled aria-label="Encender" />)

  await userEvent.click(screen.getByRole('switch'))
  expect(cambiar).not.toHaveBeenCalled()
})

test('encendido va en «success», nunca en «brand»', () => {
  // Es un estado del sistema, no una acción destacada. Y apagado va en gris y no
  // en rojo: apagar la cobranza no es un error (§7).
  const { container } = render(<Switch checked onCheckedChange={vi.fn()} aria-label="x" />)
  expect(container.querySelector('.bg-success')).not.toBeNull()
  expect(container.querySelector('.bg-brand')).toBeNull()
  expect(container.querySelector('.bg-destructive')).toBeNull()

  cleanup()
  const apagado = render(<Switch checked={false} onCheckedChange={vi.fn()} aria-label="x" />)
  expect(apagado.container.querySelector('.bg-destructive')).toBeNull()
})
