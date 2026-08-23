import { afterEach, expect, test } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChatMessageItem } from './chat-message-item'
import type { ChatMessage } from './types'

/**
 * La burbuja de una foto, que no se parece a la de un texto: la imagen llega a los
 * bordes y la hora se lee encima, como en cualquier chat. Se prueba montando el
 * mensaje directo, sin el panel: lo que se afirma es la forma de la burbuja.
 */
const ALT = 'Imagen enviada a Numi'

function foto(over: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'm1',
    role: 'user',
    content: '',
    at: '2026-08-23T15:04:00.000Z',
    imageUrl: 'blob:foto',
    status: 'sent',
    ...over,
  }
}

function pintar(message: ChatMessage) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ChatMessageItem message={message} orgId="o1" />
    </QueryClientProvider>,
  )
}

afterEach(cleanup)

test('la hora va encima de la foto, no en una franja debajo', () => {
  pintar(foto())

  const img = screen.getByAltText(ALT)
  const marco = img.closest('div')
  // La hora vive dentro del mismo marco que la imagen: eso es lo que permite que la
  // foto ocupe la burbuja entera sin reservarle un renglón debajo.
  expect(within(marco!).getByText(/\d{1,2}:\d{2}/)).toBeInTheDocument()
  // Y una sola vez: la burbuja no repite su hora fuera de la imagen.
  expect(document.querySelectorAll('time')).toHaveLength(1)
})

test('las palomitas viajan con la hora, encima de la foto', () => {
  pintar(foto({ status: 'sending' }))

  const marco = screen.getByAltText(ALT).closest('div')
  expect(within(marco!).getByRole('img', { name: 'Enviado' })).toBeInTheDocument()
})

test('tocar la foto la abre a tamaño completo', async () => {
  const user = userEvent.setup()
  pintar(foto())

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Ver la imagen a tamaño completo' }))

  const visor = await screen.findByRole('dialog')
  expect(within(visor).getByAltText(ALT)).toBeInTheDocument()
  expect(within(visor).getByRole('button', { name: 'Cerrar la imagen' })).toBeInTheDocument()
})

test('lo escrito junto a la foto se lee debajo de ella', () => {
  pintar(foto({ content: '¿de cuánto es esta factura?' }))

  expect(screen.getByAltText(ALT)).toBeInTheDocument()
  expect(screen.getByText('¿de cuánto es esta factura?')).toBeInTheDocument()
})

test('mientras la imagen archivada no llega, la burbuja no enseña un hueco roto', () => {
  // Sin `imageUrl` y sin poder resolver el documento: se espera, no se rompe.
  pintar(foto({ imageUrl: undefined, documentIds: ['d1'] }))

  expect(screen.queryByAltText(ALT)).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Ver la imagen a tamaño completo' })).not.toBeInTheDocument()
})

test('con pie, la hora va después del texto y no flotando sobre la foto', () => {
  pintar(foto({ content: '¿de cuánto es esta factura?' }))

  const marco = screen.getByAltText(ALT).closest('div')
  expect(within(marco!).queryByText(/\d{1,2}:\d{2}/)).not.toBeInTheDocument()
  // Sigue habiendo una hora, y una sola: la del pie de la burbuja.
  expect(document.querySelectorAll('time')).toHaveLength(1)
})
