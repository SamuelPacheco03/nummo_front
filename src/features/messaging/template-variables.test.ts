import { describe, expect, test } from 'vitest'
import { buildExamples, parseVariables } from './template-variables'

describe('qué variables usa una plantilla', () => {
  test('las saca en el orden en que aparecen', () => {
    expect(parseVariables('Hola {{nombre}}, debes {{monto}} desde el {{fecha}}')).toEqual([
      'nombre',
      'monto',
      'fecha',
    ])
  })

  test('una repetida cuenta una vez: Meta pide un ejemplo por variable, no por aparición', () => {
    expect(parseVariables('{{nombre}}, {{nombre}}, hola {{nombre}}')).toEqual(['nombre'])
  })

  test('mira varios textos a la vez, porque la cabecera también lleva variables', () => {
    expect(parseVariables('{{empresa}}', 'Hola {{nombre}}')).toEqual(['empresa', 'nombre'])
  })

  test('tolera los espacios de dentro de las llaves', () => {
    expect(parseVariables('{{ nombre }}')).toEqual(['nombre'])
  })

  test('un texto sin variables no declara ninguna', () => {
    expect(parseVariables('Gracias por tu pago.')).toEqual([])
    expect(parseVariables(null, undefined, '')).toEqual([])
  })

  test('no confunde llaves sueltas con una variable', () => {
    expect(parseVariables('{esto} no es {{}} una {{1nombre}}')).toEqual([])
  })
})

describe('los ejemplos que se mandan', () => {
  test('uno por variable, con lo escrito', () => {
    expect(buildExamples('Hola {{nombre}}, debes {{monto}}', { nombre: 'Ana', monto: '$120' })).toEqual(
      { nombre: 'Ana', monto: '$120' },
    )
  })

  test('una variable borrada del texto deja de viajar, aunque su ejemplo siga escrito', () => {
    // Es el fallo que este filtro evita: Meta rechaza un ejemplo que no
    // corresponde a ningún marcador.
    expect(buildExamples('Hola {{nombre}}', { nombre: 'Ana', monto: '$120' })).toEqual({
      nombre: 'Ana',
    })
  })

  test('sin variables no se manda el campo, que no es lo mismo que mandarlo vacío', () => {
    expect(buildExamples('Gracias por tu pago.', {})).toBeUndefined()
    expect(buildExamples(null, { nombre: 'Ana' })).toBeUndefined()
  })

  test('una variable sin ejemplo escrito viaja vacía, no se pierde', () => {
    expect(buildExamples('Hola {{nombre}}', {})).toEqual({ nombre: '' })
  })
})
