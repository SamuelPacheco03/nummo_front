import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { NumiWidget } from './numi-widget'
import { useNumiStore } from './numi-store'

const m = vi.hoisted(() => ({
  responder: null as null | ((r: { data: unknown }) => void),
  llamadas: 0,
}))

vi.mock('@/features/organizations/hooks', () => ({
  useCurrentOrg: () => ({ orgId: 'o1', role: 'OWNER', organization: { name: 'Demo' } }),
}))
vi.mock('./use-numi-history', () => ({
  useNumiConversations: () => ({ conversations: [], isLoading: false }),
  useNumiMessages: () => ({ messages: [], isLoading: false }),
  useMessageAudioLoader: () => undefined,
}))
vi.mock('@/api/generated/endpoints/assistant/assistant', () => ({
  usePostApiV1OrganizationsOrgIdAssistantChat: () => ({
    isPending: false,
    mutateAsync: () => {
      m.llamadas++
      return new Promise((resolve) => {
        m.responder = resolve as (r: { data: unknown }) => void
      })
    },
  }),
  usePostApiV1OrganizationsOrgIdAssistantChatAudio: () => ({ isPending: false, mutateAsync: vi.fn() }),
}))

function pintar() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <NumiWidget />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  m.responder = null
  m.llamadas = 0
  localStorage.clear()
  useNumiStore.setState({
    isOpen: false,
    orgId: null,
    sessionId: undefined,
    messages: [],
    error: null,
    hydrated: false,
    unread: false,
    pending: false,
  })
})
afterEach(cleanup)

test('lo enviado sigue ahí al cerrar y volver a abrir el chat', async () => {
  const user = userEvent.setup()
  pintar()
  useNumiStore.getState().open()

  const caja = await screen.findByLabelText('Mensaje para Numi')
  await user.type(caja, 'cuánto me deben')
  await user.keyboard('{Enter}')
  expect(await screen.findByText('cuánto me deben')).toBeInTheDocument()

  // Se cierra el chat con la respuesta todavía en camino.
  await user.click(screen.getByRole('button', { name: /cerrar/i }))
  expect(screen.queryByText('cuánto me deben')).not.toBeInTheDocument()

  // Numi contesta mientras el panel está cerrado.
  m.responder?.({ data: { sessionId: 's1', reply: 'Te deben $2.350.000' } })

  useNumiStore.getState().open()
  expect(await screen.findByText('cuánto me deben')).toBeInTheDocument()
  await waitFor(() => expect(screen.getByText(/Te deben/)).toBeInTheDocument())
})

test('el hilo se guarda: volver a la app no es empezar de cero', async () => {
  const user = userEvent.setup()
  pintar()
  useNumiStore.getState().open()

  await user.type(await screen.findByLabelText('Mensaje para Numi'), 'hola')
  await user.keyboard('{Enter}')
  m.responder?.({ data: { sessionId: 's1', reply: 'Hola, ¿en qué te ayudo?' } })
  await screen.findByText('Hola, ¿en qué te ayudo?')

  /*
    Lo que hace el móvil al salir de la app: descarta la página. Lo único que
    sobrevive es lo guardado, así que se aparta antes de vaciar el store —que
    al vaciarse vuelve a guardar— y se devuelve como lo encontraría el arranque.
  */
  const guardado = localStorage.getItem('nummo-numi')
  expect(guardado).toContain('hola')
  cleanup()
  useNumiStore.setState({ isOpen: false, orgId: null, sessionId: undefined, messages: [], hydrated: false })
  localStorage.setItem('nummo-numi', guardado!)
  await useNumiStore.persist.rehydrate()

  expect(useNumiStore.getState().messages.map((x) => x.content)).toEqual([
    'hola',
    'Hola, ¿en qué te ayudo?',
  ])
  expect(useNumiStore.getState().sessionId).toBe('s1')
})

test('si Numi contesta con el chat cerrado, el icono lo dice', async () => {
  const user = userEvent.setup()
  pintar()
  useNumiStore.getState().open()

  await user.type(await screen.findByLabelText('Mensaje para Numi'), 'hola')
  await user.keyboard('{Enter}')
  await user.click(screen.getByRole('button', { name: /cerrar/i }))

  expect(screen.getByRole('button', { name: 'Abrir el chat con Numi' })).toBeInTheDocument()
  m.responder?.({ data: { sessionId: 's1', reply: 'Hola' } })

  // El aviso vive en el icono de Numi: la respuesta está en el chat, y el
  // sitio donde se dice es al que hay que ir.
  expect(
    await screen.findByRole('button', { name: 'Abrir el chat con Numi · respuesta nueva' }),
  ).toBeInTheDocument()

  // Y se apaga al abrir, sin más ceremonia.
  await user.click(screen.getByRole('button', { name: /respuesta nueva/ }))
  expect(useNumiStore.getState().unread).toBe(false)
})
