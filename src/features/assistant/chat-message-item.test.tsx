import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatMessageItem } from './chat-message-item'
import type { ChatMessage } from './types'

const BASE: ChatMessage = {
  id: 'm1',
  role: 'user',
  content: 'cuánto me debe Ana Torres',
  at: '2026-08-16T15:30:00.000Z',
}

afterEach(cleanup)

test('una nota de voz no enseña su transcripción hasta que se pide', async () => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  render(<ChatMessageItem message={{ ...BASE, audioUrl: 'blob:local', dictated: true }} />)

  // Mandaste un audio porque no querías escribir: el texto no se cuela solo.
  expect(screen.queryByText('cuánto me debe Ana Torres')).not.toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: 'Transcribir' }))
  expect(screen.getByText('cuánto me debe Ana Torres')).toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: 'Ocultar transcripción' }))
  expect(screen.queryByText('cuánto me debe Ana Torres')).not.toBeInTheDocument()
})

test('un mensaje dictado sin audio guardado se lee tal cual', () => {
  render(<ChatMessageItem message={{ ...BASE, dictated: true, hasAudio: false }} />)

  // No hay nada que reproducir: esconder el texto dejaría la burbuja vacía.
  expect(screen.getByText('cuánto me debe Ana Torres')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Transcribir' })).not.toBeInTheDocument()
  expect(screen.getByLabelText('Mensaje dictado')).toBeInTheDocument()
})

test('mientras Numi transcribe no hay nada que ofrecer', () => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  render(<ChatMessageItem message={{ ...BASE, content: '', audioUrl: 'blob:local' }} />)

  expect(screen.queryByRole('button', { name: 'Transcribir' })).not.toBeInTheDocument()
})
