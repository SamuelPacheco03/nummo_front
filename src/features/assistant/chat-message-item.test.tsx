import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ChatMessageItem } from './chat-message-item'
import type { ChatMessage } from './types'

const BASE: ChatMessage = {
  id: 'm1',
  role: 'user',
  content: 'cuánto me debe Ana Torres',
  at: '2026-08-16T15:30:00.000Z',
}

afterEach(cleanup)

test('una nota de voz se escucha, no se lee', () => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  render(<ChatMessageItem message={{ ...BASE, audioUrl: 'blob:local', dictated: true }} />)

  // Mandaste un audio porque no querías escribir: el texto no se cuela debajo.
  expect(screen.queryByText('cuánto me debe Ana Torres')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Reproducir la nota de voz' })).toBeInTheDocument()
})

test('un mensaje dictado sin audio guardado se lee tal cual', () => {
  render(<ChatMessageItem message={{ ...BASE, dictated: true, hasAudio: false }} />)

  // No hay nada que reproducir: esconder el texto dejaría la burbuja vacía.
  expect(screen.getByText('cuánto me debe Ana Torres')).toBeInTheDocument()
  expect(screen.getByLabelText('Mensaje dictado')).toBeInTheDocument()
})
