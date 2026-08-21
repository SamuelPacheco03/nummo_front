import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
  _reiniciarClarity,
  cargarClarity,
  consentimientoGuardado,
  guardarConsentimiento,
  hayQuePreguntar,
} from './consent'

beforeEach(() => {
  localStorage.clear()
  _reiniciarClarity()
  document.head.querySelectorAll('script[src*="clarity"]').forEach((s) => s.remove())
})

afterEach(() => {
  vi.unstubAllEnvs()
})

test('sin elegir nada, no hay consentimiento guardado', () => {
  expect(consentimientoGuardado()).toBeNull()
})

test('lo elegido se recuerda entre visitas', () => {
  guardarConsentimiento('si')
  expect(consentimientoGuardado()).toBe('si')
  guardarConsentimiento('no')
  expect(consentimientoGuardado()).toBe('no')
})

/*
  Un banner de cookies en una página que no pone cookies de terceros es teatro: molesta,
  entrena a aceptar sin leer y no protege nada. Sin Clarity configurado, no se pregunta.
*/
test('sin nada de terceros configurado, no se pregunta', () => {
  vi.stubEnv('VITE_CLARITY_ID', '')
  expect(hayQuePreguntar()).toBe(false)
})

test('con algo que preguntar y sin respuesta, se pregunta una vez', () => {
  vi.stubEnv('VITE_CLARITY_ID', 'abc123')
  expect(hayQuePreguntar()).toBe(true)

  guardarConsentimiento('no')
  expect(hayQuePreguntar()).toBe(false)
})

test('Clarity entra una sola vez, por mucho que se acepte dos', () => {
  cargarClarity('abc123')
  cargarClarity('abc123')

  const scripts = document.head.querySelectorAll('script[src*="clarity.ms"]')
  expect(scripts).toHaveLength(1)
  expect(scripts[0].getAttribute('src')).toContain('abc123')
})

/* Un storage bloqueado no puede tumbar la portada ni colar analítica por defecto. */
test('si el almacenamiento falla, se trata como «no ha elegido»', () => {
  const romper = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('bloqueado')
  })
  expect(consentimientoGuardado()).toBeNull()
  romper.mockRestore()
})
