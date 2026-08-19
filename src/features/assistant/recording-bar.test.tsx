import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RecordingBar } from './recording-bar'

const LEVELS = [0.1, 0.4, 0.9, 0.2, 0.6]

function pintar(props: Partial<Parameters<typeof RecordingBar>[0]> = {}) {
  const acciones = {
    onCancel: vi.fn(),
    onPause: vi.fn(),
    onResume: vi.fn(),
    onStop: vi.fn(),
  }
  render(<RecordingBar seconds={65} levels={LEVELS} paused={false} {...acciones} {...props} />)
  return acciones
}

afterEach(cleanup)

test('muestra el tiempo grabado y una barra por medición', () => {
  const { container } = render(
    <RecordingBar
      seconds={65}
      levels={LEVELS}
      paused={false}
      onCancel={vi.fn()}
      onPause={vi.fn()}
      onResume={vi.fn()}
      onStop={vi.fn()}
    />,
  )

  expect(screen.getByText('1:05')).toBeInTheDocument()
  expect(container.querySelectorAll('[aria-hidden] > span')).toHaveLength(LEVELS.length)
})

test('las tres salidas están y cada una hace la suya', async () => {
  const user = userEvent.setup()
  const acciones = pintar()

  await user.click(screen.getByRole('button', { name: 'Descartar grabación' }))
  await user.click(screen.getByRole('button', { name: 'Pausar' }))
  await user.click(screen.getByRole('button', { name: 'Enviar nota de voz' }))

  expect(acciones.onCancel).toHaveBeenCalledTimes(1)
  expect(acciones.onPause).toHaveBeenCalledTimes(1)
  expect(acciones.onStop).toHaveBeenCalledTimes(1)
  expect(acciones.onResume).not.toHaveBeenCalled()
})

test('en pausa el mismo botón reanuda', async () => {
  const user = userEvent.setup()
  const acciones = pintar({ paused: true })

  expect(screen.queryByRole('button', { name: 'Pausar' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Reanudar' }))

  expect(acciones.onResume).toHaveBeenCalledTimes(1)
  expect(acciones.onPause).not.toHaveBeenCalled()
})

test('solo dice «fijada» cuando se llegó ahí con el candado', () => {
  pintar()
  expect(screen.queryByText('Fijada')).not.toBeInTheDocument()

  cleanup()
  pintar({ locked: true })
  expect(screen.getByText('Fijada')).toBeInTheDocument()
})
