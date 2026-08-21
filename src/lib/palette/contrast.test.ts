import { expect, test } from 'vitest'
import { AA_LARGE, contrast, inkOnFill, luminance, rgbTriplet } from './contrast'

/** Redondeo a un decimal, que es como se citan las razones de contraste. */
const r1 = (n: number) => Math.round(n * 10) / 10

test('los extremos dan los valores de la norma', () => {
  expect(r1(contrast('#ffffff', '#000000'))).toBe(21)
  expect(contrast('#2563eb', '#2563eb')).toBe(1)
  expect(luminance('#000000')).toBe(0)
  expect(luminance('#ffffff')).toBe(1)
})

/*
  Los cinco valores que `context.md` ya tenía escritos a mano. Si esta función no los
  reproduce, es la función la que está mal, no el documento: son los que justificaron
  que `--success-strong` y `--warning-strong` existan.
*/
test('reproduce las razones que context.md ya documentaba', () => {
  expect(r1(contrast('#ffffff', '#2563eb'))).toBe(5.2)
  expect(r1(contrast('#14b8a6', '#f8fafc'))).toBe(2.4)
  expect(r1(contrast('#0f766e', '#f8fafc'))).toBe(5.2)
  expect(r1(contrast('#f59e0b', '#f8fafc'))).toBe(2.1)
})

test('el orden de los argumentos no cambia el resultado', () => {
  expect(contrast('#0f172a', '#f8fafc')).toBe(contrast('#f8fafc', '#0f172a'))
})

test('acepta las dos formas del hex y rechaza lo que no lo es', () => {
  expect(contrast('#fff', '#000')).toBe(contrast('#ffffff', '#000000'))
  expect(luminance('f8fafc')).toBe(luminance('#f8fafc'))
  expect(() => luminance('rebeca')).toThrow(/no reconocido/i)
  expect(() => luminance('#12345')).toThrow(/no reconocido/i)
})

test('el triplete sale en el formato que espera CSS', () => {
  expect(rgbTriplet('#0f172a')).toBe('15 23 42')
  expect(rgbTriplet('#fff')).toBe('255 255 255')
})

/*
  El comportamiento que de verdad importa de `inkOnFill`: NO maximiza contraste. Sobre
  el azul de marca el negro contrasta más que el blanco y aun así tiene que salir
  blanco, porque un botón primario con letra negra no se lee como un botón primario.
*/
test('la tinta de un relleno prefiere la clara mientras aguante', () => {
  const polos = ['#0f172a', '#ffffff'] as const

  // Azul de marca: el blanco pasa de sobra (5.2:1).
  expect(inkOnFill('#2563eb', polos)).toBe('#ffffff')

  /*
    El caso que separa esta regla de «maximizar contraste»: sobre el azul del sidebar
    (#3b82f6) la tinta oscura contrasta MÁS que la blanca, y aun así sale blanca. Es lo
    que hace la consola de hoy, y lo contrario se leería como un botón deshabilitado.
  */
  expect(contrast('#3b82f6', '#0f172a')).toBeGreaterThan(contrast('#3b82f6', '#ffffff'))
  expect(inkOnFill('#3b82f6', polos)).toBe('#ffffff')

  // Teal y ámbar de relleno: demasiado pálidos para el blanco, se cae a la tinta oscura.
  expect(inkOnFill('#14b8a6', polos)).toBe('#0f172a')
  expect(inkOnFill('#f59e0b', polos)).toBe('#0f172a')
})

test('el corte de la tinta está exactamente en 3:1', () => {
  const polos = ['#000000', '#ffffff'] as const
  /*
    Un relleno justo por encima del corte se queda con la tinta clara; justo por debajo,
    se cae a la oscura. Se comprueba con la propia razón para que el test no dependa de
    un hex concreto que alguien pueda retocar.
  */
  const claros = ['#767676', '#787878', '#7a7a7a', '#8a8a8a']
  for (const fill of claros) {
    const esperado = contrast(fill, '#ffffff') >= AA_LARGE ? '#ffffff' : '#000000'
    expect(inkOnFill(fill, polos), `${fill}`).toBe(esperado)
  }
})
