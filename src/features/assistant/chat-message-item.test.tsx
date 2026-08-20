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

test('las palomitas cuentan en qué anda un mensaje propio', () => {
  const { rerender } = render(<ChatMessageItem message={{ ...BASE, status: 'queued' }} />)
  expect(screen.getByRole('img', { name: 'En espera' })).toBeInTheDocument()

  rerender(<ChatMessageItem message={{ ...BASE, status: 'sending' }} />)
  expect(screen.getByRole('img', { name: 'Enviado' })).toBeInTheDocument()

  rerender(<ChatMessageItem message={{ ...BASE, status: 'sent' }} />)
  expect(screen.getByRole('img', { name: 'Entregado' })).toBeInTheDocument()
})

test('un mensaje propio traído del historial ya está entregado', () => {
  // Sin marca porque vino del servidor: dejarlo pelado pondría los mensajes de hoy
  // con palomitas y los de ayer sin ellas.
  render(<ChatMessageItem message={BASE} />)
  expect(screen.getByRole('img', { name: 'Entregado' })).toBeInTheDocument()
})

test('lo que dice Numi no lleva palomitas: no hay nada que entregar', () => {
  render(<ChatMessageItem message={{ ...BASE, role: 'assistant', content: 'Te deben $50.000' }} />)
  expect(screen.queryByRole('img', { name: 'Entregado' })).not.toBeInTheDocument()
})

test('lo que no salió lo dice debajo, con su salida', () => {
  render(<ChatMessageItem message={{ ...BASE, status: 'failed' }} onRetry={vi.fn()} />)

  // Un fallo no cabe entre la hora y las palomitas: necesita el «Reintentar» al lado.
  expect(screen.getByText('No se envió')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  expect(screen.queryByRole('img', { name: 'Entregado' })).not.toBeInTheDocument()
})
