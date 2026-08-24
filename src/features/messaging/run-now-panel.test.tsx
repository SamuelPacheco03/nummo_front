import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { ApiError } from '@/api/http-client'
import type { CollectionRemindersRun } from '@/api/generated/model'

const m = vi.hoisted(() => ({ correr: vi.fn(), avisos: [] as string[] }))

vi.mock('sonner', () => ({
  toast: {
    success: (t: string) => m.avisos.push(t),
    error: (t: string) => m.avisos.push(t),
  },
}))
vi.mock('./hooks', () => ({
  useRunCollectionReminders: () => ({ mutateAsync: m.correr, isPending: false }),
}))

const { RunNowPanel } = await import('./run-now-panel')

function pasada(over: Partial<CollectionRemindersRun> = {}): CollectionRemindersRun {
  return {
    before: 0,
    onDue: 0,
    overdue: 0,
    queued: 0,
    skipped: 0,
    overdueDeferred: 0,
    withoutPhone: 0,
    sameDayDeferred: 0,
    ...over,
  }
}

const pintar = (canRun = true) =>
  render(
    <MemoryRouter>
      <RunNowPanel orgId="o1" canRun={canRun} />
    </MemoryRouter>,
  )

beforeEach(() => {
  m.correr = vi.fn().mockResolvedValue({ data: pasada() })
  m.avisos = []
})
afterEach(cleanup)

test('explica por qué existe el botón: el automático sale una vez al día', () => {
  pintar()
  expect(screen.getByText(/salen una vez al día/i)).toBeInTheDocument()
})

test('encola, y el texto no promete que se enviaron', async () => {
  // El worker despacha después: un «enviados» aquí sería mentira.
  m.correr = vi.fn().mockResolvedValue({ data: pasada({ overdue: 3, queued: 3 }) })
  pintar()
  await userEvent.click(screen.getByRole('button', { name: /Enviar ahora/ }))

  expect(await screen.findByText(/3 mensajes encolados/)).toBeInTheDocument()
  expect(screen.queryByText(/enviados/i)).not.toBeInTheDocument()
})

test('pulsarlo dos veces no es un error: dice que ya estaba dicho', async () => {
  /*
    La segunda pulsación devuelve **todo en cero**: el aviso ya quedó registrado
    y la consulta ni siquiera lo devuelve. Un panel entero de ceros sin una
    palabra al lado se lee como avería.
  */
  m.correr = vi.fn().mockResolvedValue({ data: pasada() })
  pintar()
  await userEvent.click(screen.getByRole('button', { name: /Enviar ahora/ }))

  expect(await screen.findByText(/ya estaba dicho/)).toBeInTheDocument()
})

test('las cifras de etapa no se leen como envíos fallidos', async () => {
  // `before`, `onDue` y `overdue` cuentan lo REVISADO en cada etapa; lo que salió
  // es `queued`. Sin decirlo, «Ya vencidos: 3 · En cola: 1» parece que fallaron dos.
  m.correr = vi.fn().mockResolvedValue({ data: pasada({ overdue: 3, queued: 1 }) })
  pintar()
  await userEvent.click(screen.getByRole('button', { name: /Enviar ahora/ }))

  expect(await screen.findByText(/lo que se revisó en cada etapa/)).toBeInTheDocument()
})

test('quien cedió el turno del día no se da por perdido', async () => {
  m.correr = vi.fn().mockResolvedValue({ data: pasada({ queued: 1, sameDayDeferred: 4 }) })
  pintar()
  await userEvent.click(screen.getByRole('button', { name: /Enviar ahora/ }))

  expect(await screen.findByText('Cedieron el turno')).toBeInTheDocument()
  expect(screen.getByText(/no se pierden/)).toBeInTheDocument()
})

test('el botón no se deshabilita tras pulsarlo: repetir no duplica', async () => {
  pintar()
  const boton = screen.getByRole('button', { name: /Enviar ahora/ })
  await userEvent.click(boton)

  expect(boton).toBeEnabled()
})

test('«salieron menos de los que esperaba» tiene respuesta a la vista', async () => {
  m.correr = vi.fn().mockResolvedValue({
    data: pasada({ overdue: 30, queued: 12, withoutPhone: 15, overdueDeferred: 3 }),
  })
  pintar()
  await userEvent.click(screen.getByRole('button', { name: /Enviar ahora/ }))

  expect(await screen.findByText(/12 mensajes encolados/)).toBeInTheDocument()
  expect(screen.getByText('Sin teléfono')).toBeInTheDocument()
  expect(screen.getByText(/No se les puede escribir/)).toBeInTheDocument()
  expect(screen.getByText(/Cayeron en horas de silencio/)).toBeInTheDocument()
})

test('un contador en cero no arrastra su explicación, que ahí sería ruido', async () => {
  m.correr = vi.fn().mockResolvedValue({ data: pasada({ queued: 1, overdue: 1 }) })
  pintar()
  await userEvent.click(screen.getByRole('button', { name: /Enviar ahora/ }))

  await screen.findByText(/1 mensaje encolado/)
  expect(screen.getByText('Sin teléfono')).toBeInTheDocument()
  expect(screen.queryByText(/No se les puede escribir/)).not.toBeInTheDocument()
})

test('con algo en cola remite al historial, que es donde se ve salir', async () => {
  m.correr = vi.fn().mockResolvedValue({ data: pasada({ queued: 2 }) })
  pintar()
  await userEvent.click(screen.getByRole('button', { name: /Enviar ahora/ }))

  expect(await screen.findByRole('link', { name: 'Ver el historial' })).toHaveAttribute(
    'href',
    '/cartera/cobranza',
  )
})

test('el 409 se cuenta como política apagada, no como fallo genérico', async () => {
  m.correr = vi
    .fn()
    .mockRejectedValue(new ApiError(409, { code: 'CONFLICT', message: 'disabled' }))
  pintar()
  await userEvent.click(screen.getByRole('button', { name: /Enviar ahora/ }))

  expect(m.avisos.at(-1)).toMatch(/cobranza está apagada/i)
})

test('sin `messaging.send` se explica igual, pero no se ofrece disparar', () => {
  pintar(false)

  expect(screen.getByText(/salen una vez al día/i)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Enviar ahora/ })).not.toBeInTheDocument()
})
