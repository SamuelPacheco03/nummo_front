import { afterEach, expect, test, vi } from 'vitest'
import { customFetch } from './http-client'
import { clearCsrfToken } from '@/lib/csrf'

afterEach(() => {
  vi.unstubAllGlobals()
  clearCsrfToken()
})

/** Devuelve las URL que se pidieron, en orden, y una respuesta 200 vacía para todas. */
function espiarFetch() {
  const urls: string[] = []
  const headers: Headers[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      urls.push(String(url))
      headers.push(new Headers(init.headers))
      const cuerpo = url.includes('/auth/csrf') ? { csrfToken: 't0ken' } : {}
      return new Response(JSON.stringify(cuerpo), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }),
  )
  return { urls, headers }
}

/*
  El motivo de que exista el guard: `ensureCsrfToken()` no lee una cookie, hace una
  petición. Sin él, la primera señal de cada visitante de la portada dispararía una
  llamada a un endpoint de AUTH desde una página sin sesión.
*/
test('una mutación pública no pide token CSRF', async () => {
  const { urls, headers } = espiarFetch()
  await customFetch('/api/v1/public/signals', { method: 'POST', body: '{}' })

  expect(urls.filter((u) => u.includes('/auth/csrf'))).toEqual([])
  expect(urls).toHaveLength(1)
  expect(headers[0].has('x-csrf-token')).toBe(false)
})

test('una mutación de la consola sí lo pide', async () => {
  const { urls, headers } = espiarFetch()
  await customFetch('/api/v1/contacts', { method: 'POST', body: '{}' })

  expect(urls.some((u) => u.includes('/auth/csrf'))).toBe(true)
  expect(headers.at(-1)?.get('x-csrf-token')).toBe('t0ken')
})

test('una lectura pública tampoco lo pide', async () => {
  const { urls } = espiarFetch()
  await customFetch('/api/v1/public/pricing', { method: 'GET' })

  expect(urls).toEqual(['/api/v1/public/pricing'])
})

/* La cookie de visitante es lo que hace que la atribución sobreviva a un bloqueador. */
test('las peticiones públicas siguen llevando las cookies', async () => {
  let init: RequestInit | undefined
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, opciones: RequestInit) => {
      init = opciones
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
    }),
  )
  await customFetch('/api/v1/public/signals', { method: 'POST', body: '{}' })

  expect(init).toMatchObject({ credentials: 'include' })
})
