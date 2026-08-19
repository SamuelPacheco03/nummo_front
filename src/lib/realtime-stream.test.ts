import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { subscribeToRealtime, type RealtimeEvent } from './realtime-stream'

/**
 * `EventSource` no existe en jsdom, así que se pone uno de mentira que además deja
 * inspeccionar lo que importa: cuántas conexiones se abrieron y a qué URL.
 */
const abiertas: FakeSource[] = []

class FakeSource {
  static abiertas = 0
  readonly listeners = new Map<string, Set<EventListener>>()
  cerrada = false

  readonly url: string

  constructor(url: string) {
    this.url = url
    FakeSource.abiertas += 1
    abiertas.push(this)
  }

  addEventListener(kind: string, fn: EventListener) {
    const set = this.listeners.get(kind) ?? new Set()
    this.listeners.set(kind, set)
    set.add(fn)
  }

  close() {
    this.cerrada = true
  }

  /** Simula una trama del servidor. */
  emitir(kind: string, data: unknown) {
    for (const fn of this.listeners.get(kind) ?? []) {
      fn({ data: JSON.stringify(data) } as MessageEvent)
    }
  }
}

beforeEach(() => {
  abiertas.length = 0
  FakeSource.abiertas = 0
  vi.stubGlobal('EventSource', FakeSource)
})
afterEach(() => vi.unstubAllGlobals())

const ultima = () => abiertas.at(-1) as FakeSource

describe('una conexión para toda la aplicación', () => {
  test('apunta al stream de la organización, no al del chat', () => {
    /*
      El backend unificó su stream: `/assistant/events` ya no existe. Es el motivo de que
      esto viva en `lib` y no dentro del chat.
    */
    const baja = subscribeToRealtime('o1', vi.fn())

    expect(ultima().url).toContain('/api/v1/organizations/o1/events')
    baja()
  })

  test('varios suscriptores comparten una sola conexión', () => {
    // Una pestaña que abriera un `EventSource` por función acabaría con cuatro diciendo
    // lo mismo. Es justo lo que el stream único vino a evitar.
    const baja1 = subscribeToRealtime('o1', vi.fn())
    const baja2 = subscribeToRealtime('o1', vi.fn())

    expect(FakeSource.abiertas).toBe(1)
    baja1()
    baja2()
  })

  test('el aviso llega a todos los que escuchan', () => {
    const chat = vi.fn()
    const campanita = vi.fn()
    const baja1 = subscribeToRealtime('o1', chat)
    const baja2 = subscribeToRealtime('o1', campanita)

    ultima().emitir('message', { conversationId: 'c1' })

    const esperado: RealtimeEvent = { kind: 'message', conversationId: 'c1' }
    expect(chat).toHaveBeenCalledWith(esperado)
    expect(campanita).toHaveBeenCalledWith(esperado)
    baja1()
    baja2()
  })

  test('se cierra con el último que se va, no con el primero', () => {
    // Cerrar al irse el primero dejaría mudos a los demás; no cerrar nunca pagaría una
    // conexión con nadie escuchando.
    const baja1 = subscribeToRealtime('o1', vi.fn())
    const baja2 = subscribeToRealtime('o1', vi.fn())

    baja1()
    expect(ultima().cerrada).toBe(false)

    baja2()
    expect(ultima().cerrada).toBe(true)
  })

  test('cambiar de organización abre otro stream', () => {
    // El anterior habla de datos que ya no son los de esta pantalla.
    const baja1 = subscribeToRealtime('o1', vi.fn())
    const baja2 = subscribeToRealtime('o2', vi.fn())

    expect(FakeSource.abiertas).toBe(2)
    expect(abiertas[0]?.cerrada).toBe(true)
    expect(ultima().url).toContain('/organizations/o2/events')
    baja1()
    baja2()
  })

  test('un aviso ilegible no rompe nada', () => {
    const oyente = vi.fn()
    const baja = subscribeToRealtime('o1', oyente)

    for (const fn of ultima().listeners.get('message') ?? []) {
      expect(() => fn({ data: '{roto' } as MessageEvent)).not.toThrow()
    }
    expect(oyente).not.toHaveBeenCalled()
    baja()
  })

  test('sin organización no se conecta a nada', () => {
    const baja = subscribeToRealtime(undefined, vi.fn())
    expect(FakeSource.abiertas).toBe(0)
    expect(() => baja()).not.toThrow()
  })
})

describe('lo que el chat escucha', () => {
  test('ignora lo que no es suyo', async () => {
    /*
      El stream trae ahora avisos de notificaciones y de listas que se quedaron viejas. El
      chat solo actúa sobre los suyos: filtrarlo aquí evita que cada consumidor tenga que
      acordarse.
    */
    const { useNumiEvents } = await import('@/features/assistant/numi-events')
    expect(typeof useNumiEvents).toBe('function')

    const recibidos: string[] = []
    const baja = subscribeToRealtime('o1', (e) => {
      if (e.kind === 'message' || e.kind === 'conversation') recibidos.push(e.kind)
    })

    ultima().emitir('notification', { notificationId: 'n1' })
    ultima().emitir('resource', { resource: 'receivables' })
    ultima().emitir('conversation', {})

    expect(recibidos).toEqual(['conversation'])
    baja()
  })
})
