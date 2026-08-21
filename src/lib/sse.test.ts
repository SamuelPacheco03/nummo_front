import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { postEventStream } from './sse'
import { ApiError } from '@/api/http-client'

/**
 * El transporte del chat, probado por donde se rompe: el troceado de un flujo que no
 * llega por eventos completos, y el fallo que vuelve como JSON en vez de como flujo.
 */

function stream(frames: string[]): Response {
  const encoder = new TextEncoder()
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const frame of frames) controller.enqueue(encoder.encode(frame))
        controller.close()
      },
    }),
    { status: 200, headers: { 'content-type': 'text/event-stream' } },
  )
}

function stubFetch(response: Response) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    void init
    if (String(url).includes('/auth/csrf')) {
      return new Response(JSON.stringify({ csrfToken: 't0k3n' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    return response
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function collect(response: Response): Promise<[string, unknown][]> {
  stubFetch(response)
  const events: [string, unknown][] = []
  await postEventStream({
    path: '/api/v1/algo',
    body: { hola: true },
    signal: new AbortController().signal,
    onEvent: (event, data) => events.push([event, data]),
  })
  return events
}

beforeEach(() => {
  vi.unstubAllGlobals()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

test('un evento partido entre dos lecturas llega entero y una sola vez', async () => {
  // Un `read()` no corta por eventos: puede traer medio evento, o tres y pico.
  const events = await collect(
    stream([
      'event: start\ndata: {"sessionId":"s1"}\n\nevent: chunk\ndata: {"te',
      'xt":"hola"}\n\nevent: done\ndata: {"reply":"hola"}\n\n',
    ]),
  )

  expect(events).toEqual([
    ['start', { sessionId: 's1' }],
    ['chunk', { text: 'hola' }],
    ['done', { reply: 'hola' }],
  ])
})

test('un evento ilegible se salta sin tumbar el turno', async () => {
  const events = await collect(
    stream(['event: chunk\ndata: {roto\n\nevent: chunk\ndata: {"text":"sigue"}\n\n']),
  )

  expect(events).toEqual([['chunk', { text: 'sigue' }]])
})

test('lo que falla antes del primer trozo vuelve como JSON, no como flujo', async () => {
  /*
    La trampa del handoff: sin proveedor, organización suspendida o sin clave el backend
    responde con su status y un cuerpo JSON. Abrir el lector ahí no produce ni un evento
    y la pantalla se queda esperando un turno que ya falló.
  */
  stubFetch(
    new Response(
      JSON.stringify({ error: { code: 'VALIDATION', message: 'Falta ANTHROPIC_API_KEY.' } }),
      { status: 422, headers: { 'content-type': 'application/json' } },
    ),
  )

  const error = await postEventStream({
    path: '/api/v1/algo',
    body: {},
    signal: new AbortController().signal,
    onEvent: () => {},
  }).catch((e: unknown) => e)

  expect(error).toBeInstanceOf(ApiError)
  expect(error).toMatchObject({ status: 422, code: 'VALIDATION', message: 'Falta ANTHROPIC_API_KEY.' })
})

test('un 200 que no es flujo de eventos tampoco se lee como tal', async () => {
  // El `content-type` es lo que se mira, no solo el status.
  stubFetch(
    new Response(JSON.stringify({ error: { code: 'INTERNAL', message: 'Vaya.' } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  )

  const error = await postEventStream({
    path: '/api/v1/algo',
    body: {},
    signal: new AbortController().signal,
    onEvent: () => {},
  }).catch((e: unknown) => e)

  expect(error).toMatchObject({ code: 'INTERNAL', message: 'Vaya.' })
})

test('un evento de error a mitad del flujo lanza con su código', async () => {
  stubFetch(
    stream([
      'event: chunk\ndata: {"text":"la mitad"}\n\n',
      'event: error\ndata: {"error":{"code":"RATE_LIMITED","message":"Demasiados turnos."}}\n\n',
    ]),
  )

  const seen: string[] = []
  const error = await postEventStream({
    path: '/api/v1/algo',
    body: {},
    signal: new AbortController().signal,
    onEvent: (event) => seen.push(event),
  }).catch((e: unknown) => e)

  expect(seen).toEqual(['chunk'])
  expect(error).toMatchObject({ code: 'RATE_LIMITED', message: 'Demasiados turnos.' })
})

test('manda el token CSRF y pide eventos', async () => {
  const fetchMock = stubFetch(stream(['event: done\ndata: {}\n\n']))
  await postEventStream({
    path: '/api/v1/algo',
    body: { a: 1 },
    signal: new AbortController().signal,
    onEvent: () => {},
  })

  const call = fetchMock.mock.calls.find(([url]) => String(url).includes('/api/v1/algo'))
  const init = call?.[1]
  const headers = new Headers(init?.headers)
  expect(init?.method).toBe('POST')
  expect(headers.get('x-csrf-token')).toBe('t0k3n')
  expect(headers.get('accept')).toBe('text/event-stream')
  expect(init?.body).toBe('{"a":1}')
})
