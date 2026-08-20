import { describe, expect, it } from 'vitest'
import { deviceLabel, toRegistration, urlBase64ToUint8Array } from './push'

describe('urlBase64ToUint8Array', () => {
  it('convierte base64url, con sus dos sustituciones', () => {
    // `-` y `_` son base64url; en base64 normal son `+` y `/`.
    expect(Array.from(urlBase64ToUint8Array('-_8'))).toEqual([251, 255])
  })

  it('repone el relleno que base64url se ahorra', () => {
    // `atob` exige que la longitud sea múltiplo de cuatro; una clave VAPID de 87
    // caracteres no lo es, y sin reponer el `=` revienta.
    expect(() => urlBase64ToUint8Array('QQ')).not.toThrow()
    expect(Array.from(urlBase64ToUint8Array('QQ'))).toEqual([65])
  })

  it('una clave VAPID de verdad da 65 bytes', () => {
    // Es una clave pública P-256 sin comprimir: 1 + 32 + 32.
    const vapid =
      'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
    expect(urlBase64ToUint8Array(vapid)).toHaveLength(65)
  })
})

describe('deviceLabel', () => {
  it('nombra el navegador y el sistema, en ese orden', () => {
    expect(
      deviceLabel(
        'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Mobile Safari/537.36',
      ),
    ).toBe('Chrome · Android')
    expect(
      deviceLabel(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Safari/604.1',
      ),
    ).toBe('Safari · iPhone')
  })

  it('los que dicen ser Chrome y Safari además de lo suyo se reconocen bien', () => {
    // Es la razón del orden de la tabla: Edge y Samsung llevan «Chrome» y
    // «Safari» en su cadena, así que buscarlos después los perdería.
    expect(deviceLabel('Mozilla/5.0 (Windows NT 10.0) Chrome/126 Safari/537.36 Edg/126')).toBe(
      'Edge · Windows',
    )
    expect(
      deviceLabel('Mozilla/5.0 (Linux; Android 13) SamsungBrowser/23 Chrome/115 Safari/537.36'),
    ).toBe('Samsung Internet · Android')
    expect(deviceLabel('Mozilla/5.0 (iPhone) CriOS/126 Mobile/15E148 Safari/604.1')).toBe(
      'Chrome · iPhone',
    )
  })

  it('lo que no se reconoce entero enseña lo que sí', () => {
    expect(deviceLabel('Mozilla/5.0 (Windows NT 10.0)')).toBe('Windows')
    expect(deviceLabel('algo raro')).toBe('Este dispositivo')
  })
})

describe('toRegistration', () => {
  const suscripcion = (json: unknown) => ({ toJSON: () => json }) as unknown as PushSubscription

  it('pasa el endpoint y las dos claves tal cual', () => {
    expect(
      toRegistration(
        suscripcion({ endpoint: 'https://push/1', keys: { p256dh: 'abc', auth: 'def' } }),
      ),
    ).toEqual({ endpoint: 'https://push/1', keys: { p256dh: 'abc', auth: 'def' } })
  })

  it('sin las dos claves no se registra nada', () => {
    // Un dispositivo sin clave de cifrado es uno que nunca va a recibir: es
    // mejor no tenerlo en la lista que tenerlo mudo.
    expect(toRegistration(suscripcion({ endpoint: 'https://push/1', keys: { p256dh: 'abc' } }))).toBeNull()
    expect(toRegistration(suscripcion({ keys: { p256dh: 'a', auth: 'b' } }))).toBeNull()
  })
})
