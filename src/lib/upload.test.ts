import { afterEach, expect, test, vi } from 'vitest'
import { ApiError } from '@/api/http-client'
import { postMultipart } from './upload'

vi.mock('@/lib/csrf', () => ({ ensureCsrfToken: () => Promise.resolve('tok') }))

/**
 * Un `XMLHttpRequest` de mentira que la prueba conduce a mano: primero el evento
 * de subida terminada, después el de respuesta. Son dos momentos distintos y esa
 * distancia es justo lo que este módulo existe para exponer.
 */
class FakeXhr {
  static ultimo: FakeXhr
  status = 200
  responseText = '{}'
  withCredentials = false
  readonly cabeceras: Record<string, string> = {}
  readonly abierto: { method: string; url: string }[] = []
  cuerpo: FormData | null = null
  private readonly propios: Record<string, () => void> = {}
  private readonly deSubida: Record<string, () => void> = {}

  readonly upload = {
    addEventListener: (tipo: string, fn: () => void) => {
      this.deSubida[tipo] = fn
    },
  }

  constructor() {
    FakeXhr.ultimo = this
  }

  open(method: string, url: string) {
    this.abierto.push({ method, url })
  }
  setRequestHeader(nombre: string, valor: string) {
    this.cabeceras[nombre] = valor
  }
  addEventListener(tipo: string, fn: () => void) {
    this.propios[tipo] = fn
  }
  send(cuerpo: FormData) {
    this.cuerpo = cuerpo
  }

  /** El último byte de la petición salió. */
  subida() {
    this.deSubida.load?.()
  }
  /** El servidor contestó. */
  respuesta(status: number, body: unknown) {
    this.status = status
    this.responseText = JSON.stringify(body)
    this.propios.load?.()
  }
  falla() {
    this.propios.error?.()
  }
  /** Lo que hace el navegador cuando alguien llama a `xhr.abort()`. */
  abort() {
    this.abortada = true
    this.propios.abort?.()
  }
  abortada = false
}

function stubXhr() {
  vi.stubGlobal('XMLHttpRequest', FakeXhr)
}

afterEach(() => vi.unstubAllGlobals())

test('avisa de que terminó de subir ANTES de tener respuesta', async () => {
  stubXhr()
  const subido = vi.fn()
  const form = new FormData()
  form.append('image', new Blob(['x']))

  const promesa = postMultipart<{ reply: string }>({
    path: '/api/v1/organizations/o1/assistant/chat/image',
    body: form,
    onUploaded: subido,
  })
  // `ensureCsrfToken` es asíncrono: hay que dejar que el XHR se abra.
  await vi.waitFor(() => expect(FakeXhr.ultimo?.cuerpo).not.toBeNull())

  FakeXhr.ultimo.subida()
  /*
    Esto es todo el módulo: aquí la foto ya está entregada —dos palomitas— y Numi
    todavía no ha dicho nada. Con `fetch` los dos momentos serían uno solo.
  */
  expect(subido).toHaveBeenCalledTimes(1)

  FakeXhr.ultimo.respuesta(200, { reply: 'Es una factura de $120.000' })
  await expect(promesa).resolves.toEqual({ reply: 'Es una factura de $120.000' })
})

test('manda las cookies y el CSRF, y deja el `boundary` al navegador', async () => {
  stubXhr()
  const promesa = postMultipart({ path: '/api/v1/algo', body: new FormData() })
  await vi.waitFor(() => expect(FakeXhr.ultimo?.cuerpo).not.toBeNull())

  expect(FakeXhr.ultimo.withCredentials).toBe(true)
  expect(FakeXhr.ultimo.cabeceras['x-csrf-token']).toBe('tok')
  // Etiquetarlo a mano lo dejaría sin el `boundary` del multipart.
  expect(FakeXhr.ultimo.cabeceras['Content-Type']).toBeUndefined()

  FakeXhr.ultimo.respuesta(200, {})
  await promesa
})

test('un error del contrato llega como `ApiError`, con su código', async () => {
  stubXhr()
  const promesa = postMultipart({ path: '/api/v1/algo', body: new FormData() })
  await vi.waitFor(() => expect(FakeXhr.ultimo?.cuerpo).not.toBeNull())

  // El 409 de cuota agotada: es lo que el chat traduce a «llevas N de M».
  FakeXhr.ultimo.respuesta(409, {
    error: { code: 'LIMIT_EXCEEDED', message: 'Sin cuota', details: { limit: 'vision_documents_monthly' } },
  })

  await expect(promesa).rejects.toBeInstanceOf(ApiError)
  await expect(promesa).rejects.toMatchObject({ status: 409, code: 'LIMIT_EXCEEDED' })
})

test('una red caída no se confunde con una respuesta vacía', async () => {
  stubXhr()
  const promesa = postMultipart({ path: '/api/v1/algo', body: new FormData() })
  await vi.waitFor(() => expect(FakeXhr.ultimo?.cuerpo).not.toBeNull())

  FakeXhr.ultimo.falla()

  await expect(promesa).rejects.toThrow(/No se pudo conectar/)
})

test('detener corta la petición y se distingue de una caída', async () => {
  stubXhr()
  const corte = new AbortController()
  const promesa = postMultipart({
    path: '/api/v1/algo',
    body: new FormData(),
    signal: corte.signal,
  })
  await vi.waitFor(() => expect(FakeXhr.ultimo?.cuerpo).not.toBeNull())

  corte.abort()

  expect(FakeXhr.ultimo.abortada).toBe(true)
  // `AbortError` es lo que deja a quien llama decir «lo paré yo» en vez de «se cayó»:
  // para el código son la misma excepción y para quien mira son dos cosas distintas.
  await expect(promesa).rejects.toMatchObject({ name: 'AbortError' })
})

test('abortar mientras se pide el CSRF no deja la promesa colgando', async () => {
  stubXhr()
  const corte = new AbortController()
  corte.abort()

  await expect(
    postMultipart({ path: '/api/v1/algo', body: new FormData(), signal: corte.signal }),
  ).rejects.toMatchObject({ name: 'AbortError' })
})
