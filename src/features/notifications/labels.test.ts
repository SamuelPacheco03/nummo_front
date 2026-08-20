import { describe, expect, it } from 'vitest'
import { interruptingChannels, leadDaysText, notificationIcon, notificationTypeCopy } from './labels'

describe('leadDaysText', () => {
  it('el plural lo pide la enumeración, no el número suelto', () => {
    expect(leadDaysText([1])).toBe('1 día antes')
    expect(leadDaysText([5, 1])).toBe('5 y 1 días antes')
    expect(leadDaysText([2])).toBe('2 días antes')
    expect(leadDaysText([7, 3, 1])).toBe('7, 3 y 1 días antes')
  })

  it('el día cero no es «cero días antes»', () => {
    expect(leadDaysText([0])).toBe('el mismo día')
    expect(leadDaysText([1, 0])).toBe('1 día antes y el mismo día')
  })

  it('ordena de más lejos a más cerca y no repite', () => {
    // Llegan como los guarde el backend; se leen como se piensan.
    expect(leadDaysText([1, 5, 5])).toBe('5 y 1 días antes')
  })

  it('sin días no inventa una frase', () => {
    expect(leadDaysText([])).toBe('')
  })
})

describe('interruptingChannels', () => {
  it('el centro no es un canal que se pueda apagar', () => {
    // `INAPP` queda fuera siempre: el motor lo descarta al decidir por dónde
    // interrumpir, así que una casilla suya no apagaría nada.
    expect(interruptingChannels(['INAPP', 'PUSH'], ['INAPP', 'PUSH'])).toEqual(['PUSH'])
    expect(interruptingChannels(['INAPP'], ['INAPP', 'PUSH'])).toEqual([])
  })

  it('un canal que el despliegue no tiene encendido no se ofrece', () => {
    // EMAIL existe en el enum y todavía no tiene remitente.
    expect(interruptingChannels(['INAPP', 'PUSH', 'EMAIL'], ['INAPP', 'PUSH'])).toEqual(['PUSH'])
  })
})

describe('lo que llega sin traducir', () => {
  it('un tipo nuevo se enseña crudo en vez de desaparecer', () => {
    // Desaparecer sería peor: nadie podría apagarlo.
    expect(notificationTypeCopy('cosa.nueva')).toEqual({ label: 'cosa.nueva' })
  })

  it('una clave de icono desconocida cae en la campana', () => {
    expect(notificationIcon('lo-que-sea').className).toBe('text-muted-foreground')
  })
})
