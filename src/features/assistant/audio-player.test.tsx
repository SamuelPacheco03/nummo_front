import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AudioPlayer } from './audio-player'

const AT = '2026-08-16T10:30:00.000Z'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

/**
 * jsdom no reproduce nada: `play()` no existe y `AudioContext` tampoco. Lo que
 * se comprueba aquí es lo que sí es nuestro — cuándo se pide el audio.
 */
function stubMedia() {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
}

test('el audio archivado no se pide hasta que se le da a play', async () => {
  stubMedia()
  const load = vi.fn().mockResolvedValue('https://firmada.example/audio.webm')
  render(<AudioPlayer load={load} at={AT} />)

  // Pintar el hilo no firma URLs: treinta mensajes dictados serían treinta.
  expect(load).not.toHaveBeenCalled()

  await userEvent.click(screen.getByRole('button', { name: 'Reproducir la nota de voz' }))
  await waitFor(() => expect(load).toHaveBeenCalledTimes(1))
})

test('el audio de esta sesión ya viene puesto y no pide nada', async () => {
  stubMedia()
  const load = vi.fn()
  render(<AudioPlayer src="blob:local" load={load} at={AT} />)

  await userEvent.click(screen.getByRole('button', { name: 'Reproducir la nota de voz' }))
  expect(load).not.toHaveBeenCalled()
})

test('si falla, el botón invita a reintentar y la segunda vez fuerza una URL nueva', async () => {
  stubMedia()
  const load = vi
    .fn()
    .mockRejectedValueOnce(new Error('403'))
    .mockResolvedValueOnce('https://firmada.example/otra.webm')
  render(<AudioPlayer load={load} at={AT} />)

  await userEvent.click(screen.getByRole('button', { name: 'Reproducir la nota de voz' }))
  const retry = await screen.findByRole('button', { name: 'Reintentar la nota de voz' })
  expect(screen.getByText('No se pudo cargar')).toBeInTheDocument()
  expect(load).toHaveBeenNthCalledWith(1, false)

  await userEvent.click(retry)
  // `true` = tira la URL guardada: la anterior pudo caducar.
  await waitFor(() => expect(load).toHaveBeenNthCalledWith(2, true))
})
