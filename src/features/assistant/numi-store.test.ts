import { beforeEach, describe, expect, it } from 'vitest'
import { useNumiStore } from './numi-store'
import type { ChatMessage } from './types'

const msg = (id: string, content = id): ChatMessage => ({
  id,
  role: 'user',
  content,
  at: '2026-08-16T00:00:00.000Z',
})

const reset = () =>
  useNumiStore.setState({
    isOpen: false,
    orgId: null,
    sessionId: undefined,
    messages: [],
    error: null,
    hydrated: false,
    historyId: null,
    unread: false,
    pending: false,
  })

beforeEach(reset)

describe('prependOlder', () => {
  it('pone la historia por delante, sin tocar el orden de lo que ya se lee', () => {
    useNumiStore.setState({ messages: [msg('m3'), msg('m4')] })
    useNumiStore.getState().prependOlder([msg('m1'), msg('m2')])

    expect(useNumiStore.getState().messages.map((m) => m.id)).toEqual(['m1', 'm2', 'm3', 'm4'])
  })

  it('no duplica lo que el hilo ya tiene', () => {
    useNumiStore.setState({ messages: [msg('m2'), msg('m3')] })
    // Las páginas se solapan: el tramo guardado en el navegador puede ser más
    // largo que una página del servidor.
    useNumiStore.getState().prependOlder([msg('m1'), msg('m2')])

    expect(useNumiStore.getState().messages.map((m) => m.id)).toEqual(['m1', 'm2', 'm3'])
  })

  it('si no hay nada nuevo, deja el hilo intacto', () => {
    /*
      No es una optimización: el efecto que llama a esto vuelve a correr cada vez
      que react-query rehace su array de páginas. Devolver un hilo nuevo idéntico
      al anterior sería un render en bucle, así que la identidad tiene que ser la
      misma, no solo el contenido.
    */
    useNumiStore.setState({ messages: [msg('m1'), msg('m2')] })
    const antes = useNumiStore.getState().messages
    useNumiStore.getState().prependOlder([msg('m1')])

    expect(useNumiStore.getState().messages).toBe(antes)
  })
})

describe('historyId — qué conversación se puede seguir hacia atrás', () => {
  it('hidratar la abre: es la conversación que ya existía en el servidor', () => {
    useNumiStore.getState().hydrate('c1', [msg('m1')])
    expect(useNumiStore.getState().historyId).toBe('c1')
  })

  it('sin conversación previa no hay nada que seguir', () => {
    useNumiStore.getState().hydrate(undefined, [])
    expect(useNumiStore.getState().historyId).toBeNull()
  })

  it('si el usuario escribió antes de que llegara el historial, su hilo manda y la historia sigue ahí', () => {
    useNumiStore.setState({ sessionId: 'c1', messages: [msg('local', 'lo que acabo de escribir')] })
    useNumiStore.getState().hydrate('c1', [msg('m1')])

    const s = useNumiStore.getState()
    expect(s.messages.map((m) => m.content)).toEqual(['lo que acabo de escribir'])
    expect(s.historyId).toBe('c1')
  })

  it('estrenar conversación la cierra: todo lo suyo está a la vista', () => {
    useNumiStore.getState().hydrate('c1', [msg('m1')])
    useNumiStore.getState().newConversation()
    expect(useNumiStore.getState().historyId).toBeNull()
  })

  it('cambiar de empresa también, que el hilo anterior habla de otros datos', () => {
    useNumiStore.setState({ orgId: 'o1' })
    useNumiStore.getState().hydrate('c1', [msg('m1')])
    useNumiStore.getState().switchOrg('o2')
    expect(useNumiStore.getState().historyId).toBeNull()
  })
})
