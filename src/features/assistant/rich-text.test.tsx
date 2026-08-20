import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RichText } from './rich-text'
import { parseBlocks, parseInline, splitGlued } from './rich-text-parser'

test('agrupa viñetas consecutivas en una lista', () => {
  const blocks = parseBlocks('Tus deudores:\n- Ana: $50.000\n- Luis: $20.000\n\nTotal: $70.000')
  expect(blocks).toEqual([
    { type: 'p', text: 'Tus deudores:' },
    { type: 'ul', items: ['Ana: $50.000', 'Luis: $20.000'] },
    { type: 'p', text: 'Total: $70.000' },
  ])
})

test('separa negrita y código del texto plano', () => {
  expect(parseInline('Saldo **$1.000** en `Caja`')).toEqual([
    { type: 'text', value: 'Saldo ' },
    { type: 'bold', value: '$1.000' },
    { type: 'text', value: ' en ' },
    { type: 'code', value: 'Caja' },
  ])
})

test('pinta el markdown como nodos, no como HTML', () => {
  render(<RichText text={'Hola **Ana**\n- uno\n- dos'} />)
  expect(screen.getByText('Ana').tagName).toBe('STRONG')
  expect(screen.getAllByRole('listitem')).toHaveLength(2)
})

test('separa las dos partes de un turno que llegan pegadas', () => {
  /*
    Numi dice primero lo que va a hacer, consulta los datos y después contesta. Las dos
    partes llegan por el mismo flujo y sin nada en medio: «…urgente!Con datos de hoy…».
  */
  expect(
    parseBlocks('Déjame revisar tu situación con datos frescos!Con datos de hoy, esto es lo urgente:'),
  ).toEqual([
    { type: 'p', text: 'Déjame revisar tu situación con datos frescos!' },
    { type: 'p', text: 'Con datos de hoy, esto es lo urgente:' },
  ])
})

test('la segunda parte en negrita también se separa', () => {
  expect(splitGlued('Voy a revisarlo.**Tienes $1.149.000 vencidos**')).toBe(
    'Voy a revisarlo.\n\n**Tienes $1.149.000 vencidos**',
  )
})

test('lo que no es una costura se queda como está', () => {
  // Una sigla y unas iniciales llevan punto y mayúscula pegados, y partirlas ahí
  // rompería un nombre de verdad; el dinero y una frase normal, ni se tocan.
  expect(splitGlued('Le debes a Semillas S.A.S. y a J.P. Rojas')).toBe(
    'Le debes a Semillas S.A.S. y a J.P. Rojas',
  )
  expect(splitGlued('Te deben $1.149.000. Vencido: $340.000.')).toBe(
    'Te deben $1.149.000. Vencido: $340.000.',
  )
})
